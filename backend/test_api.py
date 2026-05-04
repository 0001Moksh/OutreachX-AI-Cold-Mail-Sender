import requests
import uuid
import jwt

payload = {"sub": str(uuid.uuid4()), "email": f"{uuid.uuid4()}@test.com"}
token = jwt.encode(payload, "fake_secret", algorithm="HS256")

files = {'file': ('test.txt', b'Hello world')}
res = requests.post("http://127.0.0.1:8000/assets/upload", headers={"Authorization": f"Bearer {token}"}, files=files)
print(res.status_code)
print(res.json())
