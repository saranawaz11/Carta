import asyncio
import json
from datetime import datetime
from zoneinfo import ZoneInfo
from collections.abc import AsyncIterator, Callable, Iterator
from typing import Annotated, Any, Literal, TypedDict
from uuid import UUID

from langchain_core.messages import (
    AIMessage,
    AIMessageChunk,
    AnyMessage,
    HumanMessage,
    SystemMessage,
)
from langchain_core.runnables import RunnableConfig, RunnableLambda
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from schemas import TaskDateResolution, CaptureExtraction, TaskCandidate

from core import config

TOP_K = 5

SYSTEM_PROMPT = (
    "You are Carta AI, an assistant for the user's notes. Format replies in "
    "Markdown (short paragraphs, bullets, **bold**; ## headings only for long "
    "answers).\n\n"
    "Tools: search_notes finds notes; read_note returns a note's full content; "
    "create_note/create_task make new items; propose_update_note, "
    "propose_archive_note and propose_delete_note ask the user to confirm a "
    "change to an EXISTING note (the UI shows Confirm/Cancel buttons).\n\n"
    "Rules for editing, archiving or deleting an existing note:\n"
    "1. NEVER call create_note to change an existing note. Creating a note is "
    "only for when the user asks for a NEW note.\n"
    "2. Call search_notes with the user's words to find the note. If the user is "
    "answering your earlier question about which note, use the note they chose "
    "from the conversation, and search again to get its ID.\n"
    "3. If exactly one note clearly matches, IMMEDIATELY call the propose_* tool "
    "- do not ask for confirmation in text, the buttons do that. If several "
    "match, list their titles and ask which one, without calling propose_*. If "
    "none match, say so.\n"
    "4. For an update, first call read_note, then call propose_update_note with "
    "the note's COMPLETE new title and content (the existing text with the "
    "requested change applied, nothing lost).\n"
    "5. After a propose_* call, write one short sentence describing it. Never "
    "claim the change is done until the user confirms.\n"
    "6. If the conversation says 'yes'/'go ahead' but no action is pending "
    "below, redo steps 2-4 for the note being discussed instead of creating a "
    "note.\n"
    "When a pending action is described below and the user agrees, call "
    "resolve_pending_action with confirm; if they decline, cancel. Never propose "
    "the same action again while one is pending.\n"
    "Always finish with a short text reply to the user. Answer questions only "
    "from the user's notes; never invent facts."
)

CAPTURE_PROMPT = (
    "You handle exactly one short statement from the user, with no conversation "
    "and no follow-up questions. Decide and act with tools: use create_task for "
    "reminders and to-dos; use create_note for "
    "things to remember; for editing, archiving, or deleting an existing note, "
    "first call search_notes, and only if exactly one note clearly matches call "
    "the matching propose_* tool; if zero or several notes match, do not call "
    "propose_*, and reply briefly that you could not match exactly one note. "
    "If you are unsure what the user wants, call create_note with the original "
    "statement as the content and a short title. Never claim a note edit, "
    "archive, or delete is done; it needs the user's confirmation. After acting, "
    "reply with one short sentence."
)

TASK_DATE_PROMPT = (
    "Interpret a task title and its optional due date using only the supplied "
    "task text and the user's current local date, time, and timezone. Return "
    "date_status='no_date' with the original title unchanged and no due date "
    "when no date is stated. Return date_status='resolved' only when a stated "
    "date can be resolved confidently: return due_at as YYYY-MM-DD for "
    "date-only values or ISO 8601 with the user's timezone offset when a time "
    "was stated. ALWAYS resolve explicit weekday and month names (e.g. 'Friday', "
    "'March 5') into due_at, tolerating small spelling mistakes. The title is a "
    "refined task name: remove the date/time phrase and its linking word "
    "('on Friday', 'by March 5', 'tomorrow at 5pm'), fix capitalization "
    "(sentence case) and spelling, and keep the action and its object, e.g. "
    "'visit bank on Friday' becomes 'Visit bank'. "
    "Set due_has_time only when the user explicitly gave a time. "
    "Never invent a time or use today as a default. For an ambiguous or "
    "unresolvable stated date, return date_status='clarify', no due_at, and a "
    "brief user-facing message asking for a more specific date; do not guess. "
    "Interpret 'coming <weekday>' as the next occurrence after today, and "
    "'next <weekday>' as the occurrence in the following week. A month-only "
    "or period-only phrase such as 'next month' or 'last week of December' "
    "means the final calendar day of that period. An unqualified month refers "
    "to its next upcoming occurrence. If removing the date leaves no meaningful "
    "task title, ask for clarification."
)


class TaskDateGraphState(TypedDict, total=False):
    text: str
    now: str
    timezone: str
    resolution: TaskDateResolution


def _resolve_task_date_node(state: TaskDateGraphState) -> dict[str, Any]:
    timezone_name = state["timezone"]
    current = datetime.fromisoformat(state["now"]).astimezone(
        ZoneInfo(timezone_name)
    )
    model = ChatOpenAI(
        model=config.OPENAI_CHAT_MODEL,
        api_key=config.OPENAI_API_KEY or None,
    ).with_structured_output(TaskDateResolution)
    resolution = model.invoke(
        [
            SystemMessage(TASK_DATE_PROMPT),
            HumanMessage(
                f"Current local datetime: {current.isoformat()}\n"
                f"Timezone: {timezone_name}\n"
                f"Task text:\n{state['text']}"
            ),
        ]
    )
    return {"resolution": resolution}


def _compile_task_date_graph():
    graph = StateGraph(TaskDateGraphState)
    graph.add_node("resolve", _resolve_task_date_node)
    graph.add_edge(START, "resolve")
    graph.add_edge("resolve", END)
    return graph.compile()


_task_date_graph = _compile_task_date_graph()


def resolve_task_date(
    text: str, now: str, timezone_name: str
) -> TaskDateResolution:
    state = _task_date_graph.invoke(
        {"text": text, "now": now, "timezone": timezone_name}
    )
    resolution = state.get("resolution")
    if not isinstance(resolution, TaskDateResolution):
        raise RuntimeError("Task date graph returned no valid resolution")
    return resolution


CAPTURE_EXTRACTION_PROMPT = (
    "Analyze the user's statement and extract structured capture content. "
    "Notes and tasks are NOT mutually exclusive: actionable items become tasks AND "
    "the surrounding content is still kept as a note. "
    "note_content: when the statement has more than one sentence or paragraph, or "
    "contains any learning goals, reference material, plans, ideas or context, return "
    "note_content containing ALL of that content, cleaned up and with the user's "
    "paragraphs preserved (separate paragraphs with blank lines). Keep sentences "
    "that also produce a task inside the note as well; do not remove them. Do not "
    "summarize away detail and do not include instructions addressed to the "
    "assistant such as 'remind me to...' or 'keep these together as a note'. "
    "note_title: whenever note_content is returned, also return a concise, "
    "meaningful title (2-6 words, Title Case, no trailing punctuation) that names "
    "the overall topic or purpose of the note (e.g. 'Docker Learning & EC2 "
    "Deployment'), not simply its first sentence. "
    "Dates: 'mid/middle of <month>' means the 15th of that month; 'after/from/"
    "since <date>' (e.g. 'after 15th of December') means that specific date; "
    "resolve these instead of asking for clarification. "
    "Return note_content as null ONLY when the whole statement is a single short "
    "reminder or to-do with no extra context. "
    "tasks: also list every distinct actionable item or reminder as a task "
    "candidate, e.g. 'deploy my app before the end of this month' becomes a task "
    "with that month-end deadline while remaining in the note. "
    "'End of this month' means the last day of the current month. "
    "Return a list of task candidates, where each candidate has: "
    "- title: a concise, actionable task statement (3-20 words) "
    "- source_text: the original phrase/context from the input "
    "- date_status: 'no_date', 'resolved', or 'clarify' "
    "- If date_status is 'resolved', populate due_at as YYYY-MM-DD for date-only "
    "or ISO 8601 with the user's timezone offset for timed deadlines, and due_has_time "
    "accordingly. If date_status is 'clarify', provide a message asking for specifics. "
    "Never invent dates or use today as a default, but ALWAYS resolve an explicitly "
    "stated day or month: 'Friday' or 'coming Friday' is the next occurrence after "
    "today, 'next Friday' is the occurrence in the following week, an unqualified "
    "month or 'March 5' is its next upcoming occurrence (month-only means its last "
    "day); tolerate small spelling mistakes in these names. Task titles must be "
    "refined: remove the date/time phrase and its linking word, use sentence "
    "case, fix spelling, keep the action and its object (e.g. 'visit bank on "
    "Friday' becomes 'Visit bank', with the date in due_at). "
    "If the statement is purely informational with no tasks, return an empty tasks list and the note. "
    "If extraction fails or the statement is ambiguous, return clarification with an "
    "actionable message."
)


class CaptureExtractionState(TypedDict, total=False):
    text: str
    now: str
    timezone: str
    extraction: "CaptureExtraction"


def _extract_capture_node(state: CaptureExtractionState) -> dict[str, Any]:
    timezone_name = state["timezone"]
    current = datetime.fromisoformat(state["now"]).astimezone(
        ZoneInfo(timezone_name)
    )
    
    class CaptureExtractionOutput(BaseModel):
        note_title: str | None = Field(None, description="Short descriptive note title (2-6 words) reflecting the overall topic")
        note_content: str | None = Field(None, description="Informational content to save as a note")
        tasks: list[TaskCandidate] = Field(default_factory=list, description="Actionable tasks")
        clarification: str | None = Field(None, description="Message if extraction needs user clarification")
    
    model = ChatOpenAI(
        model=config.OPENAI_CHAT_MODEL,
        api_key=config.OPENAI_API_KEY or None,
    ).with_structured_output(CaptureExtractionOutput)
    
    result = model.invoke(
        [
            SystemMessage(CAPTURE_EXTRACTION_PROMPT),
            HumanMessage(
                f"Current local datetime: {current.isoformat()}\n"
                f"Timezone: {timezone_name}\n"
                f"User statement:\n{state['text']}"
            ),
        ]
    )
    
    extraction = CaptureExtraction(
        note_title=result.note_title,
        note_content=result.note_content,
        tasks=result.tasks,
        clarification=result.clarification,
    )
    return {"extraction": extraction}


def _compile_capture_extraction_graph():
    graph = StateGraph(CaptureExtractionState)
    graph.add_node("extract", _extract_capture_node)
    graph.add_edge(START, "extract")
    graph.add_edge("extract", END)
    return graph.compile()


_capture_extraction_graph = _compile_capture_extraction_graph()


def extract_capture(
    text: str, now: str, timezone_name: str
) -> CaptureExtraction:
    state = _capture_extraction_graph.invoke(
        {"text": text, "now": now, "timezone": timezone_name}
    )
    extraction = state.get("extraction")
    if not isinstance(extraction, CaptureExtraction):
        raise RuntimeError("Capture extraction graph returned no valid result")
    return extraction


_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)


class TranscriptionConnection:
    def __init__(self, client: Any, manager: Any, connection: Any) -> None:
        self._client = client
        self._manager = manager
        self._connection = connection

    async def send(self, event: str) -> None:
        await self._connection.send(json.loads(event))

    def __aiter__(self) -> AsyncIterator[str]:
        return self._events()

    async def _events(self) -> AsyncIterator[str]:
        async for event in self._connection:
            yield json.dumps(
                event.model_dump(mode="json", by_alias=True, exclude_none=True)
            )

    async def close(self) -> None:
        try:
            await self._manager.__aexit__(None, None, None)
        finally:
            await self._client.close()


async def open_transcription_session() -> TranscriptionConnection:
    client = AsyncOpenAI(api_key=config.OPENAI_API_KEY or None)
    manager = client.realtime.connect(
        extra_query={"intent": "transcription"},
    )
    connection = None
    try:
        connection = await asyncio.wait_for(manager.__aenter__(), timeout=10)
        await connection.send(
            {
                "type": "session.update",
                "session": {
                    "type": "transcription",
                    "audio": {
                        "input": {
                            "format": {"type": "audio/pcm", "rate": 24000},
                            "noise_reduction": {"type": "near_field"},
                            "transcription": {
                                "model": config.OPENAI_TRANSCRIBE_MODEL,
                                "prompt": "Transcribe faithfully; do not invent words.",
                            },
                            "turn_detection": {
                                "type": "server_vad",
                                "threshold": config.VOICE_VAD_THRESHOLD,
                                "prefix_padding_ms": 300,
                                "silence_duration_ms": config.VOICE_SILENCE_MS,
                            },
                        }
                    },
                },
            }
        )
        while True:
            event = await asyncio.wait_for(connection.recv(), timeout=10)
            if event.type == "session.updated":
                return TranscriptionConnection(client, manager, connection)
            if event.type == "error":
                raise RuntimeError(f"OpenAI transcription session error: {event}")
    except BaseException:
        try:
            if connection is not None:
                await manager.__aexit__(None, None, None)
        finally:
            await client.close()
        raise


def _embeddings() -> OpenAIEmbeddings:
    return OpenAIEmbeddings(
        model=config.OPENAI_EMBEDDING_MODEL, api_key=config.OPENAI_API_KEY or None
    )


def embed_texts(texts: list[str]) -> list[list[float]]:
    return _embeddings().embed_documents(texts) if texts else []


def embed_query(text: str) -> list[float]:
    return _embeddings().embed_query(text)


def split_note(title: str, content: str) -> list[str]:
    if not content.strip():
        return []
    return [f"{title}\n{part}" for part in _splitter.split_text(content)]


class ChatState(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]


class SearchNotesArgs(BaseModel):
    query: str = Field(description="A concise search query describing the notes to find")


class CreateNoteArgs(BaseModel):
    title: str = Field(description="The title of the note to create")
    content: str = Field(description="The note content")


class UpdateNoteArgs(BaseModel):
    note_id: UUID = Field(description="The ID of the note to update")
    title: str = Field(description="The note's proposed new title")
    content: str = Field(description="The note's proposed new content")


class CreateTaskArgs(BaseModel):
    pass


class NoteIdArgs(BaseModel):
    note_id: UUID = Field(description="The ID of the note")


def _configurable(config: RunnableConfig) -> dict[str, Any]:
    configurable = config.get("configurable")
    if not isinstance(configurable, dict):
        raise RuntimeError("Chat tool configuration is missing")
    return configurable


def _tool_context(config: RunnableConfig) -> tuple[str, dict[str, Any]]:
    configurable = _configurable(config)
    user_id = configurable.get("user_id")
    if not isinstance(user_id, str) or not user_id:
        raise RuntimeError("Authenticated user ID is missing from chat configuration")
    return user_id, configurable


def _callback(configurable: dict[str, Any], name: str) -> Callable[..., Any]:
    callback = configurable.get(name)
    if not callable(callback):
        raise RuntimeError(f"Chat tool callback {name!r} is missing")
    return callback


@tool("search_notes", args_schema=SearchNotesArgs)
def search_notes(query: str, config: RunnableConfig) -> str:
    """Search the user's notes and return up to five note IDs, titles, and snippets."""
    user_id, configurable = _tool_context(config)
    search = _callback(configurable, "similar_chunks")
    chunks = search(embed_query(query), TOP_K, user_id)
    results = [
        {
            "note_id": str(chunk["note_id"]),
            "title": chunk["title"] or "Untitled",
            "snippet": chunk["content"],
        }
        for chunk in chunks
    ]
    return json.dumps({"results": results})


@tool("read_note", args_schema=NoteIdArgs)
def read_note(note_id: UUID, config: RunnableConfig) -> str:
    """Return the full title and content of a note."""
    user_id, configurable = _tool_context(config)
    note = _callback(configurable, "get_note")(note_id, user_id)
    if note is None or note.deleted_at is not None:
        return json.dumps({"error": "Note not found or no longer available."})
    return json.dumps(
        {"note": {"note_id": str(note.id), "title": note.title or "", "content": note.content or ""}}
    )


@tool("create_note", args_schema=CreateNoteArgs)
def create_note(title: str, content: str, config: RunnableConfig) -> str:
    """Create a note immediately and return its ID and title."""
    user_id, configurable = _tool_context(config)
    create = _callback(configurable, "create_note")
    note = create(title, content, user_id)
    return json.dumps(
        {"created_note": {"note_id": str(note.id), "title": note.title or "Untitled"}}
    )


@tool("create_task", args_schema=CreateTaskArgs)
def create_task(config: RunnableConfig) -> str:
    """Create a task from the original capture statement using its date context."""
    user_id, configurable = _tool_context(config)
    create = _callback(configurable, "create_task")
    text = configurable.get("capture_text")
    now = configurable.get("now")
    timezone_name = configurable.get("timezone")
    if not isinstance(text, str) or not isinstance(now, str) or not isinstance(
        timezone_name, str
    ):
        raise RuntimeError("Capture task date context is missing")
    result = create(
        text, datetime.fromisoformat(now), timezone_name, user_id
    )
    if isinstance(result, dict) and isinstance(result.get("error"), str):
        return json.dumps({"error": result["error"]})
    task = result
    return json.dumps(
        {
            "created_task": {
                "task_id": str(task.id),
                "title": task.title,
                "due_at": task.due_at.isoformat() if task.due_at else None,
            }
        }
    )


def _propose(
    action: str,
    note_id: UUID,
    changes: dict[str, str],
    config: RunnableConfig,
) -> str:
    user_id, configurable = _tool_context(config)
    get_note = _callback(configurable, "get_note")
    note = get_note(note_id, user_id)
    if note is None or note.deleted_at is not None:
        return json.dumps({"error": "Note not found or no longer available."})
    return json.dumps(
        {
            "pending_action": {
                "action": action,
                "note_id": str(note.id),
                "note_title": note.title or "Untitled",
                "expected_updated_at": note.updated_at.isoformat(),
                "changes": changes,
            }
        }
    )


@tool("propose_update_note", args_schema=UpdateNoteArgs)
def propose_update_note(
    note_id: UUID, title: str, content: str, config: RunnableConfig
) -> str:
    """Propose updated title and content; do not modify the note."""
    return _propose(
        "update", note_id, {"title": title, "content": content}, config
    )


@tool("propose_archive_note", args_schema=NoteIdArgs)
def propose_archive_note(note_id: UUID, config: RunnableConfig) -> str:
    """Propose archiving a note; do not modify the note."""
    return _propose("archive", note_id, {}, config)


@tool("propose_delete_note", args_schema=NoteIdArgs)
def propose_delete_note(note_id: UUID, config: RunnableConfig) -> str:
    """Propose moving a note to Deleted; do not modify the note."""
    return _propose("delete", note_id, {}, config)


class ResolveArgs(BaseModel):
    decision: Literal["confirm", "cancel"] = Field(
        description="confirm if the user agreed to the pending action, cancel if they declined"
    )


@tool("resolve_pending_action", args_schema=ResolveArgs)
def resolve_pending_action(decision: str, config: RunnableConfig) -> str:
    """Execute (confirm) or discard (cancel) the pending note action the user was asked about."""
    _, configurable = _tool_context(config)
    if not configurable.get("pending_action"):
        return json.dumps({"error": "There is no pending action."})
    resolve = _callback(configurable, "resolve_action")
    return json.dumps({"resolved": resolve(decision)})


_TOOLS = [
    search_notes,
    read_note,
    create_note,
    create_task,
    propose_update_note,
    propose_archive_note,
    propose_delete_note,
    resolve_pending_action,
]


def _text_content(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(
            block["text"]
            for block in content
            if isinstance(block, dict) and isinstance(block.get("text"), str)
        )
    return ""


def _tool_payload(content: Any) -> dict[str, Any]:
    try:
        payload = json.loads(_text_content(content))
    except ValueError:
        return {}
    return payload if isinstance(payload, dict) else {}


def _stream_text(message: AIMessageChunk) -> str:
    return _text_content(message.content)


def _messages(question: str, history: list[dict]) -> list[AnyMessage]:
    messages: list[AnyMessage] = []
    for item in history:
        if not item["content"].strip():
            continue
        if item["role"] == "user":
            messages.append(HumanMessage(item["content"]))
        else:
            messages.append(AIMessage(item["content"]))
    messages.append(HumanMessage(question))
    return messages


def _route_after_model(state: ChatState) -> str:
    last_message = state["messages"][-1]
    if isinstance(last_message, AIMessage) and last_message.tool_calls:
        return "tools"
    return END


def _route_after_tools(state: ChatState) -> str:
    if any(
        isinstance(getattr(message, "name", None), str)
        and message.name.startswith("propose_")
        for message in state["messages"]
    ):
        return END
    return "model"


def _system_prompt(configurable: dict[str, Any]) -> str:
    if configurable.get("capture_prompt"):
        return configurable["capture_prompt"]
    pending = configurable.get("pending_action")
    if not pending:
        return SYSTEM_PROMPT
    return (
        f"{SYSTEM_PROMPT}\n\nPending action awaiting the user's yes/no: "
        f"{pending['action']} the note \"{pending['note_title']}\"."
    )


def _compile_graph(tools=None):
    tools = tools or _TOOLS
    model = ChatOpenAI(
        model=config.OPENAI_CHAT_MODEL,
        api_key=config.OPENAI_API_KEY or None,
        streaming=True,
    ).bind_tools(tools)
    graph = StateGraph(ChatState)
    graph.add_node(
        "model",
        RunnableLambda(
            lambda state, config: [
                SystemMessage(_system_prompt(_configurable(config))),
                *state["messages"],
            ]
        )
        | model
        | RunnableLambda(lambda response: {"messages": [response]}),
    )
    graph.add_node("tools", ToolNode(tools, handle_tool_errors=True))
    graph.add_edge(START, "model")
    graph.add_conditional_edges("model", _route_after_model)
    graph.add_conditional_edges("tools", _route_after_tools)
    return graph.compile()


def stream_chat_graph(
    question: str,
    history: list[dict],
    configurable: dict[str, Any],
) -> Iterator[dict[str, Any]]:
    graph = _compile_graph()
    answer_parts: list[str] = []
    final_state: ChatState | None = None
    graph_config: RunnableConfig = {"configurable": configurable}

    for mode, event in graph.stream(
        {"messages": _messages(question, history)},
        config=graph_config,
        stream_mode=["messages", "values"],
    ):
        if mode == "messages":
            message, metadata = event
            if (
                metadata.get("langgraph_node") == "model"
                and isinstance(message, AIMessageChunk)
            ):
                token = _stream_text(message)
                if token:
                    answer_parts.append(token)
                    yield {"token": token}
        elif mode == "values":
            final_state = event

    sources: dict[str, dict[str, str]] = {}
    pending_action = None
    created_note = None
    resolved = None
    if final_state is None:
        raise RuntimeError("Chat graph completed without a final state")

    for message in final_state["messages"]:
        name = getattr(message, "name", None)
        if not isinstance(name, str):
            continue
        payload = _tool_payload(message.content)
        if name == "search_notes":
            for result in payload.get("results", []):
                sources.setdefault(
                    result["note_id"],
                    {"note_id": result["note_id"], "title": result["title"]},
                )
        elif name == "create_note":
            created_note = payload.get("created_note")
        elif name.startswith("propose_"):
            pending_action = payload.get("pending_action")
        elif name == "resolve_pending_action":
            resolved = payload.get("resolved")

    answer = "".join(answer_parts)
    last_ai = next(
        (m for m in reversed(final_state["messages"]) if isinstance(m, AIMessage)),
        None,
    )
    if last_ai is not None and not last_ai.tool_calls:
        answer = _text_content(last_ai.content) or answer
    elif pending_action or resolved:
        answer = ""
    if pending_action and not answer.strip():
        verb = {"update": "update", "archive": "archive", "delete": "delete"}.get(
            pending_action["action"], pending_action["action"]
        )
        answer = (
            f"Do you want to {verb} “{pending_action['note_title']}”? "
            "Use the Confirm or Cancel buttons below."
        )
        yield {"token": answer}

    if resolved and not answer.strip():
        answer = resolved["message"]
        yield {"token": answer}

    if not answer.strip():
        answer = (
            "I couldn't work out which note you mean. Could you give me the "
            "note's exact title?"
        )
        yield {"token": answer}

    yield {
        "done": {
            "answer": answer,
            "sources": list(sources.values()),
            "pending_action": pending_action,
            "created_note": created_note,
            "resolved": resolved,
        }
    }


def run_capture_graph(
    text: str, now: str, timezone_name: str, configurable: dict[str, Any]
) -> dict[str, Any]:
    today = datetime.fromisoformat(now).astimezone(ZoneInfo(timezone_name))
    prompt = (
        f"{CAPTURE_PROMPT}\n\nCurrent datetime: {now}. "
        f"User timezone: {timezone_name}. Today is {today:%A %Y-%m-%d} there. "
        "When creating a task, use the create_task tool without date arguments; "
        "the backend resolves the original statement's date consistently."
    )
    graph = _compile_graph([t for t in _TOOLS if t is not resolve_pending_action])
    state = graph.invoke(
        {"messages": [HumanMessage(text)]},
        config={
            "configurable": {
                **configurable,
                "capture_text": text,
                "now": now,
                "capture_prompt": prompt,
                "timezone": timezone_name,
            }
        },
    )
    result: dict[str, Any] = {
        "task_id": None,
        "note_id": None,
        "pending_action": None,
        "message": "",
    }
    for message in state["messages"]:
        name = getattr(message, "name", None)
        if not isinstance(name, str):
            continue
        payload = _tool_payload(message.content)
        if name == "create_task":
            if "created_task" in payload:
                result["task_id"] = payload["created_task"]["task_id"]
            elif isinstance(payload.get("error"), str):
                result["message"] = payload["error"]
            else:
                result["message"] = (
                    "I couldn't create this task. Please try again."
                )
        elif name == "create_note" and "created_note" in payload:
            result["note_id"] = payload["created_note"]["note_id"]
        elif name.startswith("propose_") and "pending_action" in payload:
            result["pending_action"] = payload["pending_action"]
    last = state["messages"][-1]
    if isinstance(last, AIMessage) and not result["message"]:
        result["message"] = _text_content(last.content)
    return result


SUMMARY_PROMPT = (
    "Summarize the user's note. Be brief: a short overview and at most 5 short "
    "key points. List a deadline only when the note states an explicit date; "
    "never invent dates. Resolve relative dates (such as 'next Friday') from the "
    "current datetime and timezone given. Return due_at as an ISO 8601 datetime "
    "and set due_has_time true only if the note states a time of day. For "
    "connections, pick at most 3 of the candidate notes that are truly related "
    "and give a one-line reason each; use only the candidate ids given, and "
    "return none if nothing fits."
)


class SummaryDeadline(BaseModel):
    title: str
    due_at: str
    due_has_time: bool = False


class SummaryConnection(BaseModel):
    note_id: str
    reason: str


class NoteSummaryResult(BaseModel):
    overview: str
    key_points: list[str]
    deadlines: list[SummaryDeadline]
    connections: list[SummaryConnection]


def summarize_note(
    title: str,
    content: str,
    now: str,
    timezone_name: str,
    candidates: list[dict],
) -> NoteSummaryResult:
    model = ChatOpenAI(
        model=config.OPENAI_CHAT_MODEL, api_key=config.OPENAI_API_KEY or None
    ).with_structured_output(NoteSummaryResult)
    listing = "\n".join(
        f"- id: {c['id']} | title: {c['title']} | snippet: {c['snippet']}"
        for c in candidates
    )
    return model.invoke(
        [
            SystemMessage(SUMMARY_PROMPT),
            HumanMessage(
                f"Current datetime: {now}\nTimezone: {timezone_name}\n\n"
                f"Note title: {title}\nNote content:\n{content}\n\n"
                f"Candidate notes:\n{listing or '(none)'}"
            ),
        ]
    )
