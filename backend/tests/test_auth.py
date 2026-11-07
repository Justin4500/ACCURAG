import pytest


def test_user_registration_and_login(client):
    # 1. Register User
    reg_payload = {
        "email": "testuser@accurate.ai",
        "password": "SecurePassword123!",
        "full_name": "Test Engineer"
    }
    reg_res = client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 201, reg_res.text
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == "testuser@accurate.ai"
    assert reg_data["user"]["full_name"] == "Test Engineer"

    # 2. Reject duplicate email
    dup_res = client.post("/api/auth/register", json=reg_payload)
    assert dup_res.status_code == 400

    # 3. Valid Login
    login_res = client.post("/api/auth/login", json={
        "email": "testuser@accurate.ai",
        "password": "SecurePassword123!"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert token

    # 4. Bad password
    bad_login = client.post("/api/auth/login", json={
        "email": "testuser@accurate.ai",
        "password": "WrongPassword!"
    })
    assert bad_login.status_code == 401

    # 5. Access protected /api/auth/me
    auth_header = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/auth/me", headers=auth_header)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "testuser@accurate.ai"

    # 6. Reject unauthenticated request
    unauth_res = client.get("/api/auth/me")
    assert unauth_res.status_code == 401
