const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); // Load .env from root

const TMDB_API_KEY = process.env.TMDB_API_KEY; 
const POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w500'; // w500 is a common poster size
const NUM_PAGES_TO_FETCH = 5; // TMDB returns 20 results per page
const OUTPUT_DIR = path.join(__dirname, '..', 'client', 'public', 'background-posters');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created directory: ${OUTPUT_DIR}`);
}

async function fetchPopularMovies() {
    let allMovies = [];
    console.log('Fetching popular movies from TMDB...');
    try {
        for (let page = 1; page <= NUM_PAGES_TO_FETCH; page++) {
            const response = await axios.get(`https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`);
            if (response.data && response.data.results) {
                allMovies = allMovies.concat(response.data.results);
                console.log(`Fetched page ${page} of popular movies.`);
            } else {
                console.warn(`No results found for page ${page}.`);
            }
            // Brief pause to avoid hitting rate limits too hard, though TMDB is usually fine.
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    } catch (error) {
        console.error('Error fetching popular movies:', error.message);
        if (error.response) {
            console.error('TMDB API Response:', error.response.data);
        }
        return [];
    }
    console.log(`Fetched a total of ${allMovies.length} movie entries.`);
    return allMovies;
}

async function downloadPoster(movie) {
    if (!movie.poster_path) {
        console.warn(`No poster path for movie: ${movie.title}. Skipping.`);
        return;
    }

    const posterUrl = `${POSTER_BASE_URL}${movie.poster_path}`;
    // Sanitize movie title for filename, or use movie ID
    const filename = `${movie.id}-${movie.poster_path.substring(1).replace(/\//g, '_')}`;
    const outputPath = path.join(OUTPUT_DIR, filename);

    // Check if file already exists to avoid re-downloading
    if (fs.existsSync(outputPath)) {
        console.log(`Poster for ${movie.title} already exists: ${filename}. Skipping.`);
        return;
    }

    try {
        console.log(`Downloading poster for: ${movie.title} from ${posterUrl}`);
        const response = await axios({
            url: posterUrl,
            method: 'GET',
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log(`Successfully downloaded poster: ${filename}`);
                resolve();
            });
            writer.on('error', (err) => {
                console.error(`Error writing poster to file for ${movie.title}: ${err.message}`);
                // Clean up failed download
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                }
                reject(err);
            });
        });
    } catch (error) {
        console.error(`Error downloading poster for ${movie.title} (${posterUrl}):`, error.message);
        if (error.response && error.response.status === 404) {
            console.warn(`Poster not found (404) for ${movie.title} at ${posterUrl}`);
        }
    }
}

async function main() {
    if (!TMDB_API_KEY) {
        console.error('Error: TMDB_API_KEY is not defined.');
        console.error('Please create a .env file in the project root and add TMDB_API_KEY="your_key_here".');
        return; // Exit the script
    }

    const movies = await fetchPopularMovies();
    if (movies.length === 0) {
        console.log('No movies fetched. Exiting.');
        return;
    }

    let downloadedCount = 0;
    const maxDownloads = 100; // Target around 100 posters

    for (const movie of movies) {
        if (downloadedCount >= maxDownloads) {
            console.log(`Reached download limit of ${maxDownloads} posters.`);
            break;
        }
        if (movie.poster_path) {
            await downloadPoster(movie);
            // Small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 100));
            downloadedCount++;
        }
    }
    console.log(`\nFinished downloading posters. Total attempted downloads from list: ${downloadedCount}`);
    console.log(`Posters are saved in: ${OUTPUT_DIR}`);
    console.log('Please check the directory to ensure posters were downloaded.');

    // New: Generate poster-list.json
    try {
        const posterFiles = fs.readdirSync(OUTPUT_DIR);
        const imageFiles = posterFiles.filter(file => 
            file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png') || file.endsWith('.webp')
        );
        const posterListPath = path.join(__dirname, '..', 'client', 'public', 'poster-list.json');
        fs.writeFileSync(posterListPath, JSON.stringify(imageFiles, null, 2));
        console.log(`Successfully created poster list at: ${posterListPath}`);
        console.log(`Found ${imageFiles.length} poster images.`);
    } catch (error) {
        console.error('Error generating poster-list.json:', error.message);
    }
}

main().catch(error => {
    console.error("An unexpected error occurred in the main process:", error);
}); 