import re

# Read failed URLs
with open('C:/Users/kesau/Downloads/minr project(internship)/internship implem/backend/data/failed_urls.txt', 'r') as f:
    failed_urls = [line.split('|')[0].strip() for line in f if line.strip()]

print(f"Removing {len(failed_urls)} failed URLs...")

# Read OPML
with open(r'C:\Users\kesau\Downloads\minr project(internship)\internship implem\backend\data\feeds.opml', 'r', encoding='utf-8') as f:
    content = f.read()

# Count before
count_before = len(re.findall(r'<outline ', content))

# Remove each failed URL
for url in failed_urls:
    # Escape special regex characters in URL
    escaped_url = re.escape(url)
    # Remove the entire outline element containing this xmlUrl
    pattern = rf'<outline[^>]*xmlUrl="{escaped_url}"[^>]*/>'
    content = re.sub(pattern, '', content)

# Also handle cases where the pattern might be slightly different
for url in failed_urls:
    escaped_url = re.escape(url)
    pattern = rf'<outline[^>]*{escaped_url}[^>]*/>'
    content = re.sub(pattern, '', content)

# Count after
count_after = len(re.findall(r'<outline ', content))

print(f"Before: {count_before} outlines")
print(f"After: {count_after} outlines")
print(f"Removed: {count_before - count_after} outlines")

# Write updated OPML
with open(r'C:\Users\kesau\Downloads\minr project(internship)\internship implem\backend\data\feeds.opml', 'w', encoding='utf-8') as f:
    f.write(content)

print("OPML updated!")
