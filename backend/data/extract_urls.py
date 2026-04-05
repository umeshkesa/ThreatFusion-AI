import re

with open('C:/Users/kesau/Downloads/minr project(internship)/internship implem/backend/data/feeds.opml', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract all xmlUrl values
urls = re.findall(r'xmlUrl="([^"]+)"', content)
print(f'Total URLs: {len(urls)}')

# Write URLs to a file for processing
with open('C:/Users/kesau/Downloads/minr project(internship)/internship implem/backend/data/urls.txt', 'w', encoding='utf-8') as f:
    for url in urls:
        f.write(url + '\n')

print('URLs written to urls.txt')
