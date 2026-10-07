import json
from collections.abc import Callable, Iterator
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
from pydantic import BaseModel, Field

from core import config

TOP_K = 5

SYSTEM_PROMPT = (
    "You help the user work with their notes. Use search_notes before proposing "
    "an update, archive, or delete. If several notes match the user's request, "
    "ask which note they mean and do not propose an action. Never claim an "
    "update, archive, or delete is complete before it is executed. When a "
    "pending action is described below and the user agrees in chat (yes, ok, "
    "go ahead, etc.), call resolve_pending_action with confirm; if they "
    "decline, call it with cancel; if unclear, ask briefly. Never propose the "
    "same action again while one is pending. "
    "Answer questions only from the user's notes, and do not invent facts or "
    "sources. You may create notes immediately when asked."
)

_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)


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


@tool("create_note", args_schema=CreateNoteArgs)
def create_note(title: str, content: str, config: RunnableConfig) -> str:
    """Create a note immediately and return its ID and title."""
    user_id, configurable = _tool_context(config)
    create = _callback(configurable, "create_note")
    note = create(title, content, user_id)
    return json.dumps(
        {"created_note": {"note_id": str(note.id), "title": note.title or "Untitled"}}
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
    create_note,
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
    return json.loads(_text_content(content))


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
    pending = configurable.get("pending_action")
    if not pending:
        return SYSTEM_PROMPT
    return (
        f"{SYSTEM_PROMPT}\n\nPending action awaiting the user's yes/no: "
        f"{pending['action']} the note \"{pending['note_title']}\"."
    )


def _compile_graph():
    model = ChatOpenAI(
        model=config.OPENAI_CHAT_MODEL,
        api_key=config.OPENAI_API_KEY or None,
        streaming=True,
    ).bind_tools(_TOOLS)
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
    graph.add_node("tools", ToolNode(_TOOLS))
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

    yield {
        "done": {
            "answer": answer,
            "sources": list(sources.values()),
            "pending_action": pending_action,
            "created_note": created_note,
            "resolved": resolved,
        }
    }
