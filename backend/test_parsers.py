import asyncio
from services.asset_parser import parse_website, parse_github_repo

def test_parsers():
    print("Testing Website Parser...")
    web_text = parse_website("https://example.com")
    print(f"Website Text ({len(web_text)} chars): {web_text[:100]}...\n")

    print("Testing GitHub Parser...")
    github_text = parse_github_repo("https://github.com/torvalds/linux")
    print(f"GitHub Text ({len(github_text)} chars): {github_text[:100]}...\n")

if __name__ == "__main__":
    test_parsers()
