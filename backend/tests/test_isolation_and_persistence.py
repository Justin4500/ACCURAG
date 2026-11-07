import pytest
from app.services.chat_service import ChatService
from app.models.chat import MessageRole


def test_user_data_isolation(client):
    # Register User A
    res_a = client.post("/api/auth/register", json={
        "email": "usera@accurate.ai",
        "password": "Password123!",
        "full_name": "User Alpha"
    })
    token_a = res_a.json()["access_token"]
    header_a = {"Authorization": f"Bearer {token_a}"}

    # Register User B
    res_b = client.post("/api/auth/register", json={
        "email": "userb@accurate.ai",
        "password": "Password123!",
        "full_name": "User Beta"
    })
    token_b = res_b.json()["access_token"]
    header_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates a conversation
    conv_a = client.post("/api/chat", json={"title": "Alpha Confidential Chat"}, headers=header_a)
    assert conv_a.status_code == 201
    conv_a_id = conv_a.json()["id"]

    # User A creates a collection
    col_a = client.post("/api/collections", json={"name": "Alpha Private Files"}, headers=header_a)
    assert col_a.status_code == 201

    # User B lists conversations -> must NOT see User A's conversation
    convs_b = client.get("/api/chat", headers=header_b)
    assert convs_b.status_code == 200
    b_titles = [c["title"] for c in convs_b.json()]
    assert "Alpha Confidential Chat" not in b_titles

    # User B cannot access User A's conversation details directly
    detail_res = client.get(f"/api/chat/{conv_a_id}", headers=header_b)
    assert detail_res.status_code == 404

    # User B lists collections -> must NOT see User A's collection
    cols_b = client.get("/api/collections", headers=header_b)
    assert cols_b.status_code == 200
    b_col_names = [c["name"] for c in cols_b.json()]
    assert "Alpha Private Files" not in b_col_names


def test_conversation_persistence(client, db_session):
    # Register user
    res = client.post("/api/auth/register", json={
        "email": "persistent@accurate.ai",
        "password": "Password123!"
    })
    token = res.json()["access_token"]
    user_id = res.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create conversation
    create_res = client.post("/api/chat", json={"title": "Persistent Discussion"}, headers=headers)
    conv_id = create_res.json()["id"]

    # Add messages
    ChatService.add_message(db_session, conv_id, MessageRole.USER, "What is our Q4 forecast?")
    ChatService.add_message(
        db_session,
        conv_id,
        MessageRole.ASSISTANT,
        "The Q4 forecast is $4.2M.",
        citations=[{"document_id": "doc1", "document_name": "Forecast.pdf", "page_number": 4, "excerpt": "Total $4.2M"}]
    )

    # Fetch conversation via API
    get_res = client.get(f"/api/chat/{conv_id}", headers=headers)
    assert get_res.status_code == 200
    data = get_res.json()
    assert len(data["messages"]) == 2
    assert data["messages"][0]["role"] == "user"
    assert data["messages"][0]["content"] == "What is our Q4 forecast?"
    assert data["messages"][1]["role"] == "assistant"
    assert data["messages"][1]["citations"][0]["document_name"] == "Forecast.pdf"
    assert data["messages"][1]["citations"][0]["page_number"] == 4
