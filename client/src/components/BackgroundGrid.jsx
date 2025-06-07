import React, { useState, useEffect, useRef } from 'react';
import './BackgroundGrid.css'; // We will create this CSS file next

// Fisher-Yates (aka Knuth) Shuffle function
const shuffleArray = (array) => {
    let currentIndex = array.length, randomIndex;
    // While there remain elements to shuffle.
    while (currentIndex !== 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
    return array;
};

const BackgroundGrid = () => {
    const [posters, setPosters] = useState([]);
    const [loading, setLoading] = useState(true);
    const gridContainerRef = useRef(null);

    useEffect(() => {
        fetch('/poster-list.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok for poster-list.json');
                }
                return response.json();
            })
            .then(data => {
                setPosters(shuffleArray(data)); // Shuffle data before setting state
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching poster list:', error);
                setLoading(false);
                // Optionally, set an error state here to display a message
            });
    }, []);

    useEffect(() => {
        if (loading || !posters.length || !gridContainerRef.current) return;

        const staggerAmount = 60; // px, REDUCED from 30px

        const applyStagger = () => {
            if (!gridContainerRef.current) return;
            const items = Array.from(gridContainerRef.current.children);
            if (items.length === 0) return;

            // Reset existing margins first
            items.forEach(item => item.style.marginTop = '0px');

            // Determine number of columns
            let numColumns = 0;
            let firstItemOffsetTop = -1;
            if (items.length > 0) {
                firstItemOffsetTop = items[0].offsetTop;
                for (let i = 0; i < items.length; i++) {
                    if (items[i].offsetTop === firstItemOffsetTop) {
                        numColumns++;
                    } else {
                        break;
                    }
                }
            }
            if (numColumns === 0) numColumns = 1; // Fallback if calculation fails
            
            items.forEach((item, index) => {
                const columnIndex = index % numColumns;
                if (columnIndex % 2 !== 0) { // Apply to odd-indexed columns (0-indexed: 2nd, 4th, etc.)
                    item.style.marginTop = `-${staggerAmount}px`;
                }
            });
        };

        applyStagger();

        // Optional: Re-apply on resize, can be performance intensive
        // Consider debouncing this if you enable it
        window.addEventListener('resize', applyStagger);
        return () => {
            window.removeEventListener('resize', applyStagger);
        };

    }, [loading, posters]); // Re-run when posters are loaded

    if (loading) {
        // Optional: return a minimal loader or null if you don't want to show anything while loading
        return null; 
    }

    if (!posters || posters.length === 0) {
        // Optional: return a message or null if no posters are found
        return null;
    }

    return (
        <div className="background-grid-container" ref={gridContainerRef}>
            {posters.map((posterFile, index) => (
                <div key={index} className="background-grid-item">
                    <img 
                        src={`/background-posters/${posterFile}`} 
                        alt={`Movie poster ${index + 1}`} 
                        loading="lazy" // Lazy load images for better performance
                    />
                </div>
            ))}
        </div>
    );
};

export default BackgroundGrid; 