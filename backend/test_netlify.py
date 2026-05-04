from services.asset_parser import parse_website
url = "https://mokshbhardwaj.netlify.app"
print("Extracting...")
text = parse_website(url)
print("Extracted length:", len(text))
print("Content:", text)
