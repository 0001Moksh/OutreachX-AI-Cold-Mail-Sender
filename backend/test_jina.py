import requests
url = "https://r.jina.ai/https://mokshbhardwaj.netlify.app"
response = requests.get(url, timeout=20)
print(response.status_code)
print(response.text[:500])