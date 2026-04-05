import requests
import sys
import time
from urllib.parse import urlparse

def check_url(url, timeout=5):
    try:
        # Just check if we can reach the host
        parsed = urlparse(url)
        host = parsed.netloc
        if not host:
            return True, "Invalid URL"
        
        # Try HEAD request first
        try:
            resp = requests.head(url, timeout=timeout, allow_redirects=True)
            if resp.status_code < 400:
                return True, f"OK ({resp.status_code})"
        except:
            pass
        
        # Try GET request
        try:
            resp = requests.get(url, timeout=timeout, allow_redirects=True)
            if resp.status_code < 400:
                return True, f"OK ({resp.status_code})"
            return False, f"HTTP {resp.status_code}"
        except requests.exceptions.Timeout:
            return False, "Timeout"
        except requests.exceptions.ConnectionError:
            return False, "Connection Error"
        except Exception as e:
            return False, str(e)
            
    except Exception as e:
        return False, str(e)

# Read URLs from file
with open('C:/Users/kesau/Downloads/minr project(internship)/internship implem/backend/data/urls.txt', 'r') as f:
    urls = [line.strip() for line in f if line.strip()]

print(f"Checking {len(urls)} URLs...")
failed = []

for i, url in enumerate(urls):
    if (i + 1) % 50 == 0:
        print(f"Progress: {i+1}/{len(urls)}")
    
    success, msg = check_url(url)
    if not success:
        failed.append(f"{url}|{msg}")

print(f"\n=== RESULTS ===")
print(f"Total checked: {len(urls)}")
print(f"Failed: {len(failed)}")
print(f"\nFailed URLs:")
for f in failed:
    print(f)

# Write failed URLs to file
with open('C:/Users/kesau/Downloads/minr project(internship)/internship implem/backend/data/failed_urls.txt', 'w', encoding='utf-8') as f:
    for furl in failed:
        f.write(furl + '\n')

print(f"\nFailed URLs written to failed_urls.txt")
