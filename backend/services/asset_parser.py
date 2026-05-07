import re
import io
import base64
import requests
try:
    from bs4 import BeautifulSoup
except Exception:
    BeautifulSoup = None
import PyPDF2
import docx

def parse_website(url: str) -> str:
    """Scrapes a website and extracts its text content."""
    try:
        url = url.strip()
        
        # Try Jina AI reader first for JS rendering and clean markdown
        try:
            jina_url = f"https://r.jina.ai/{url}"
            response = requests.get(jina_url, timeout=20)
            if response.status_code == 200:
                return response.text
        except Exception:
            pass # Fall back to BeautifulSoup
            
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        if BeautifulSoup is not None:
            soup = BeautifulSoup(response.content, "html.parser")
            
            # Remove script and style elements
            for script in soup(["script", "style", "noscript", "header", "footer", "nav"]):
                script.extract()
                
            text = soup.get_text(separator='\n', strip=True)
        else:
            text = re.sub(r"<script.*?>.*?</script>|<style.*?>.*?</style>", " ", response.text, flags=re.S | re.I)
            text = re.sub(r"<[^>]+>", " ", text)
        
        # Clean up excessive newlines
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text
    except Exception as e:
        print(f"Error parsing website {url}: {e}")
        return ""

def parse_github_repo(url: str, github_token: str = None) -> str:
    """Extracts README.md text from a GitHub repository or profile URL."""
    try:
        # Clean URL to get owner and repo
        url = url.strip().rstrip('/')
        parts = url.split('/')
        
        if 'github.com' not in parts:
            return ""
            
        github_idx = parts.index('github.com')
        
        if len(parts) <= github_idx + 1:
            return ""
            
        owner = parts[github_idx + 1]
        
        if len(parts) > github_idx + 2:
            repo = parts[github_idx + 2]
        else:
            # It's a profile URL, try to get the profile README (repo named same as owner)
            repo = owner
            
        api_url = f"https://api.github.com/repos/{owner}/{repo}/readme"
        
        headers = {"Accept": "application/vnd.github.v3+json"}
        if github_token:
            headers["Authorization"] = f"token {github_token}"
            
        response = requests.get(api_url, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        if "content" in data:
            content = base64.b64decode(data["content"]).decode('utf-8')
            return content
        return ""
    except Exception as e:
        print(f"Error parsing GitHub URL {url}: {e}")
        return ""

def parse_pdf(file_bytes: bytes) -> str:
    """Extracts text from a PDF file."""
    try:
        pdf_file = io.BytesIO(file_bytes)
        reader = PyPDF2.PdfReader(pdf_file)
        text = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text.append(page_text)
        return "\n\n".join(text)
    except Exception as e:
        print(f"Error parsing PDF: {e}")
        return ""

def parse_docx(file_bytes: bytes) -> str:
    """Extracts text from a Word document."""
    try:
        doc_file = io.BytesIO(file_bytes)
        doc = docx.Document(doc_file)
        text = [paragraph.text for paragraph in doc.paragraphs if paragraph.text.strip()]
        return "\n\n".join(text)
    except Exception as e:
        print(f"Error parsing DOCX: {e}")
        return ""

def parse_html(file_bytes: bytes) -> str:
    """Extracts text from HTML file."""
    try:
        if BeautifulSoup is not None:
            soup = BeautifulSoup(file_bytes, "html.parser")
            for script in soup(["script", "style"]):
                script.extract()
            text = soup.get_text(separator='\n', strip=True)
            return text
        text = file_bytes.decode('utf-8', errors='replace')
        text = re.sub(r"<script.*?>.*?</script>|<style.*?>.*?</style>", " ", text, flags=re.S | re.I)
        return re.sub(r"<[^>]+>", " ", text)
    except Exception as e:
        print(f"Error parsing HTML file: {e}")
        return ""

def parse_text(file_bytes: bytes) -> str:
    """Extracts text from plain text file."""
    try:
        return file_bytes.decode('utf-8', errors='replace')
    except Exception as e:
        print(f"Error parsing Text file: {e}")
        return ""
