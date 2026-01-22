const DREMIO_FEED_URL = 'https://www.dremio.com/blog/feed/';
const DLH_FEED_URL = 'https://datalakehousehub.com/rss.xml';
const RSS2JSON_API = 'https://api.rss2json.com/v1/api.json?rss_url=';

// Helper to convert RSS XML to JSON via proxy to avoid CORS
async function fetchRSS(url) {
    try {
        const response = await fetch(`${RSS2JSON_API}${encodeURIComponent(url)}`);
        const data = await response.json();
        if (data.status === 'ok') {
            return data.items;
        } else {
            console.error('Error fetching RSS:', data.message);
            return [];
        }
    } catch (error) {
        console.error('Network error fetching RSS:', error);
        return [];
    }
}

function stripHtml(html) {
    let tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

function createCard(item, sourceClass) {
    // Attempt to find an image in multiple content fields
    // rss2json maps 'content:encoded' to 'content' usually, but sometimes it's just in description
    const content = item.content || item.description || "";

    const imgRegex = /<img[^>]+src="?([^"\s]+)"?\s*\/?>/i;
    let match = imgRegex.exec(content);

    // Also check separately if the description has an image if content didn't
    if (!match && item.description && item.description !== content) {
        match = imgRegex.exec(item.description);
    }

    let imageUrl = match ? match[1] : null;

    // rss2json often provides a thumbnail or enclosure property
    if (item.thumbnail) {
        imageUrl = item.thumbnail;
    } else if (item.enclosure && item.enclosure.link) {
        imageUrl = item.enclosure.link;
    }

    const date = new Date(item.pubDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const snippet = stripHtml(item.description || item.content).substring(0, 120) + '...';

    const card = document.createElement('div');
    card.className = 'card';

    // Header div with background image or pattern style
    const headerStyle = imageUrl ? `background-image: url('${imageUrl}');` : '';
    const patternClass = !imageUrl ? sourceClass : '';

    card.innerHTML = `
        <div class="card-image-header ${patternClass}" style="${headerStyle}"></div>
        <div class="card-content">
            <div class="card-meta">${date}</div>
            <h3 class="card-title">${item.title}</h3>
            <p class="card-snippet">${snippet}</p>
            <div class="card-action">
                <a href="${item.link}" target="_blank" class="read-more">
                    Read Article 
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                </a>
            </div>
        </div>
    `;
    return card;
}

async function initFeeds() {
    const dremioContainer = document.getElementById('dremio-feed');
    const dlhContainer = document.getElementById('dlh-feed');

    // Fetch Dremio Blog
    const dremioItems = await fetchRSS(DREMIO_FEED_URL);
    dremioContainer.innerHTML = ''; // Clear skeleton
    if (dremioItems.length > 0) {
        dremioItems.slice(0, 5).forEach(item => {
            // Append UTM parameters to the link
            try {
                const url = new URL(item.link);
                url.searchParams.append("utm_source", "ev_podcast");
                url.searchParams.append("utm_medium", "influencer");
                url.searchParams.append("utm_campaign", "next-gen-dremio");
                url.searchParams.append("utm_term", "get-started-dla-podcast-01-21-2026");
                url.searchParams.append("utm_content", "alexmerced");
                item.link = url.toString();
            } catch (e) {
                // Fallback for simple string if URL parsing fails (unlikely)
                if (item.link.indexOf('?') === -1) {
                    item.link += '?utm_source=ev_podcast&utm_medium=influencer&utm_campaign=next-gen-dremio&utm_term=get-started-dla-podcast-01-21-2026&utm_content=alexmerced';
                } else {
                    item.link += '&utm_source=ev_podcast&utm_medium=influencer&utm_campaign=next-gen-dremio&utm_term=get-started-dla-podcast-01-21-2026&utm_content=alexmerced';
                }
            }
            dremioContainer.appendChild(createCard(item, 'dremio-pattern'));
        });
    } else {
        dremioContainer.innerHTML = '<p>Unable to load recent updates at this time.</p>';
    }

    // Fetch DataLakehouseHub
    const dlhItems = await fetchRSS(DLH_FEED_URL);
    dlhContainer.innerHTML = ''; // Clear skeleton
    if (dlhItems.length > 0) {
        dlhItems.slice(0, 5).forEach(item => {
            dlhContainer.appendChild(createCard(item, 'dlh-pattern'));
        });
    } else {
        dlhContainer.innerHTML = '<p>Unable to load recent updates at this time.</p>';
    }
}

document.addEventListener('DOMContentLoaded', initFeeds);
