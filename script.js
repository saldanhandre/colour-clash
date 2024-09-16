document.addEventListener('DOMContentLoaded', () => {
    const gridContainer = document.querySelector('.grid-container');
    const shuffleButton = document.getElementById('shuffle-btn');
    const restartButton = document.getElementById('restart-btn');
    const startButton = document.getElementById('start-btn');
    const gameScreen = document.getElementById('game-screen');
    const mainMenu = document.getElementById('main-menu');
    const pointsDisplay = document.getElementById('points');
    const colors = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93']; // The possible colors

    let draggedCell = null;
    let draggedCellPosition = null;
    let startX, startY;

    let score = 0; // Initialize score

    // Function to start the game
    startButton.addEventListener('click', () => {
        mainMenu.style.display = 'none'; // Hide main menu
        gameScreen.style.display = 'block'; // Show game screen
    });

    // Restart Button Logic
    restartButton.addEventListener('click', () => {
        // Reset points
        score = 0;
        pointsDisplay.textContent = score;

        // Reset the grid to ensure 81 rectangles are present
        gridContainer.innerHTML = ''; // Clear grid
        for (let i = 0; i < 81; i++) {
            const cell = document.createElement('div');
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            cell.style.backgroundColor = randomColor;
            gridContainer.appendChild(cell);
        }

        // Shuffle the grid after resetting
        shuffleColors();
    });

    // Function to assign random colors to each cell
    Array.from(gridContainer.children).forEach(cell => {
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        cell.style.backgroundColor = randomColor;
    });

    const updateScore = (points) => {
        score += points;
        document.getElementById('points').textContent = score;
    };

    // Function to calculate the nearest cell based on drag position
    const getCellAtPosition = (x, y) => {
        const cells = Array.from(gridContainer.children);
        return cells.find(cell => {
            const rect = cell.getBoundingClientRect();
            return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        });
    };

    // Mousedown event to start the drag
    gridContainer.addEventListener('mousedown', (event) => {
        if (event.target === gridContainer || event.target.classList.contains('invisible')) return; // Ignore invisible cells

        draggedCell = event.target;
        draggedCellPosition = Array.from(gridContainer.children).indexOf(draggedCell);

        // Capture the initial position where drag starts
        startX = event.clientX;
        startY = event.clientY;

        // Add the dragging class for visual feedback (optional)
        draggedCell.classList.add('dragging');
    });

    // Mouseup event to finish the drag
    gridContainer.addEventListener('mouseup', (event) => {
        if (!draggedCell) return;
    
        // Remove dragging class (optional)
        draggedCell.classList.remove('dragging');
    
        // Identify where the cell is dropped
        const droppedCell = getCellAtPosition(event.clientX, event.clientY);
        const droppedCellPosition = Array.from(gridContainer.children).indexOf(droppedCell);
    
        // Ensure the dropped cell is not invisible
        if (droppedCell && draggedCell !== droppedCell && !droppedCell.classList.contains('invisible')) {
            const draggedCellPosition = Array.from(gridContainer.children).indexOf(draggedCell);
    
            const isNeighbor = Math.abs(draggedCellPosition - droppedCellPosition) === 1 || Math.abs(draggedCellPosition - droppedCellPosition) === 9;
    
            if (isNeighbor) {
                // Call the function to animate and swap cells
                swapCells(draggedCell, droppedCell);
            }
        }
    
        // Cleanup: reset the dragged state
        draggedCell = null;
    });

    // Function to swap cells with an animation
    function swapCells(draggedCell, droppedCell) {
        // Ensure this only runs once per swap
        if (draggedCell.classList.contains('swapping') || droppedCell.classList.contains('swapping')) {
            return;
        }

        // Add swapping class to prevent double animation
        draggedCell.classList.add('swapping');
        droppedCell.classList.add('swapping');

        // Calculate position difference
        const draggedRect = draggedCell.getBoundingClientRect();
        const droppedRect = droppedCell.getBoundingClientRect();

        const xDiff = droppedRect.left - draggedRect.left;
        const yDiff = droppedRect.top - draggedRect.top;

        // Apply the transform to animate the swap
        draggedCell.style.transform = `translate(${xDiff}px, ${yDiff}px)`;
        droppedCell.style.transform = `translate(${-xDiff}px, ${-yDiff}px)`;

        // After the animation completes, swap the contents
        setTimeout(() => {
            // Swap innerHTML
            const temp = draggedCell.innerHTML;
            draggedCell.innerHTML = droppedCell.innerHTML;
            droppedCell.innerHTML = temp;
        
            // Swap background colors
            const tempColor = draggedCell.style.backgroundColor;
            draggedCell.style.backgroundColor = droppedCell.style.backgroundColor;
            droppedCell.style.backgroundColor = tempColor;
        
            // To avoid bounce back, first freeze the transform
            draggedCell.style.transition = 'none';  // Disable the transition temporarily
            droppedCell.style.transition = 'none';  // Disable for dropped cell
        
            draggedCell.style.transform = '';
            droppedCell.style.transform = '';
        
            // Force a reflow to ensure the transform is reset before re-enabling transition
            void draggedCell.offsetHeight;
            void droppedCell.offsetHeight;
        
            // Re-enable transition
            draggedCell.style.transition = '';
            droppedCell.style.transition = '';
        
            // Remove swapping class
            draggedCell.classList.remove('swapping');
            droppedCell.classList.remove('swapping');

            // Update points after a successful swap
            updateScore(-3);

            // After swap, check for isolated groups of 3 and delete them
            findAndDeleteIsolatedGroups();
        }, 300);  // Time matches the CSS transition duration
    }

    // Function to get the position of neighboring cells (top, bottom, left, right)
    function getNeighbors(position) {
        const neighbors = [];
        const rowSize = 9; // Assuming the grid is 9x9
        const gridCells = Array.from(gridContainer.children);

        // Top neighbor
        if (position - rowSize >= 0) neighbors.push(position - rowSize);

        // Bottom neighbor
        if (position + rowSize < gridCells.length) neighbors.push(position + rowSize);

        // Left neighbor
        if (position % rowSize !== 0) neighbors.push(position - 1);

        // Right neighbor
        if ((position + 1) % rowSize !== 0) neighbors.push(position + 1);

        return neighbors;
    }

    // Recursive flood fill function to collect all adjacent cells of the same color
    function floodFill(startPosition, color, visited) {
        const gridCells = Array.from(gridContainer.children);
        const queue = [startPosition];
        const group = [];

        while (queue.length > 0) {
            const position = queue.pop();

            // Skip if this position is already visited
            if (visited.has(position)) continue;

            visited.add(position); // Mark as visited
            group.push(position);  // Add to the group

            // Check neighbors (top, bottom, left, right)
            const neighbors = getNeighbors(position);
            neighbors.forEach(neighbor => {
                if (!visited.has(neighbor) && gridCells[neighbor].style.backgroundColor === color) {
                    queue.push(neighbor); // Add matching neighbors to the queue
                }
            });
        }

        return group;
    }

    // Function to delete the entire group of matching colors and make them invisible
    function deleteGroup(group) {
        const gridCells = Array.from(gridContainer.children);
        group.forEach(position => {
            const cell = gridCells[position];
            cell.style.visibility = 'hidden'; // Make the cells invisible
            cell.classList.add('invisible'); // Add a class to mark as invisible
            cell.innerHTML = ''; // Optional: clear the content
        });

        // Update points after a successful deletion
        updateScore((group.length - 3)*2);
        
        // Add a slight delay before applying gravity to show that the blocks are gone
        setTimeout(() => {
            applyGravity(); // Apply gravity after 0.2 seconds
        }, 400); // Adjust the delay time (200ms)
    }

    
    // Function to apply gravity and make cells fall down
    function applyGravity() {
        const rowSize = 9; // Assuming the grid is 9x9
        const gridCells = Array.from(gridContainer.children);
        
        for (let col = 0; col < rowSize; col++) {
            let emptySpots = [];  // To track empty spots in the current column
    
            // Traverse from bottom to top in each column
            for (let row = rowSize - 1; row >= 0; row--) {
                const index = row * rowSize + col;
                const cell = gridCells[index];
    
                if (cell.classList.contains('invisible')) {
                    // Track empty cells
                    emptySpots.push(index);
                } else if (emptySpots.length > 0) {
                    // If there are empty spots below this cell, move this cell down to the lowest empty spot
                    const emptyIndex = emptySpots.shift(); // Get the lowest empty cell
                    const emptyCell = gridCells[emptyIndex];
    
                    // Swap the colors and contents
                    emptyCell.style.backgroundColor = cell.style.backgroundColor;
                    emptyCell.innerHTML = cell.innerHTML;
                    emptyCell.style.visibility = 'visible'; 
                    emptyCell.classList.remove('invisible');
    
                    // Clear the current cell
                    cell.style.backgroundColor = '';
                    cell.innerHTML = '';
                    cell.style.visibility = 'hidden'; 
                    cell.classList.add('invisible');
    
                    // Add the newly emptied cell to the list of empty spots
                    emptySpots.push(index);
                }
            }
        }
    }

    function isLastInColumn(position) {
        const rowSize = 9; // Assuming a 9x9 grid
        const gridCells = Array.from(gridContainer.children);
    
        // Check if the rectangle is in the last row
        const isBottomRow = position >= (rowSize * (rowSize - 1));
    
        // Check if no visible cells are above
        if (isBottomRow) {
            for (let row = Math.floor(position / rowSize) - 1; row >= 0; row--) {
                const cellAbove = gridCells[row * rowSize + (position % rowSize)];
                if (!cellAbove.classList.contains('invisible')) {
                    return false; // There's a visible rectangle above
                }
            }
            return true; // It's the last rectangle in the column
        }
        return false; // It's not in the last row
    }


    // Function to check and delete isolated groups of size 1, 2, or 3
    function findAndDeleteIsolatedGroups() {
        const gridCells = Array.from(gridContainer.children);
        const rowSize = 9; // Assuming a 9x9 grid
        const visited = new Set(); // To track already processed cells

        for (let i = 0; i < gridCells.length; i++) {
            if (!visited.has(i) && !gridCells[i].classList.contains('invisible')) {
                const group = floodFillLimited(i, 3); // Find groups of 1, 2, or 3 rectangles
                if ((group.length === 1 || group.length === 2 || group.length === 3) && isIsolatedGroup(group)) {
                    deleteGroup(group); // Delete the group if isolated
                }
            }
        }
    }

    // Function to perform a limited flood fill to find a group of up to 3 neighboring rectangles
    function floodFillLimited(startPosition, maxSize) {
        const gridCells = Array.from(gridContainer.children);
        const queue = [startPosition];
        const group = [];
        const visited = new Set();
    
        while (queue.length > 0 && group.length < maxSize) {
            const position = queue.pop();
    
            if (visited.has(position) || gridCells[position].classList.contains('invisible')) continue;
    
            visited.add(position);
            group.push(position);
    
            // Get the neighbors of the current rectangle
            const neighbors = getNeighbors(position);
            neighbors.forEach(neighbor => {
                if (!visited.has(neighbor) && !gridCells[neighbor].classList.contains('invisible')) {
                    queue.push(neighbor);
                }
            });
        }
    
        return group; // Return the actual group size
    }

    // Function to check if the group is isolated (no neighbors around the group)
    function isIsolatedGroup(group) {
        const gridCells = Array.from(gridContainer.children);
        const surroundingCells = new Set();

        group.forEach(position => {
            const neighbors = getNeighbors(position);
            neighbors.forEach(neighbor => {
                if (!group.includes(neighbor)) {
                    surroundingCells.add(neighbor);
                }
            });
        });

        // If all surrounding cells are invisible, the group is isolated
        for (let neighbor of surroundingCells) {
            if (!gridCells[neighbor].classList.contains('invisible')) {
                return false;
            }
        }

        return true; // All surrounding cells are invisible
    }






    // Click event to trigger the flood fill and delete the group
    gridContainer.addEventListener('click', (event) => {
        if (event.target === gridContainer || event.target.classList.contains('invisible')) return; // Ignore invisible cells

        const clickedCell = event.target;
        const clickedCellPosition = Array.from(gridContainer.children).indexOf(clickedCell);
        const clickedColor = clickedCell.style.backgroundColor;

        // Perform flood fill to find the entire group
        const visited = new Set(); // To keep track of visited cells
        const group = floodFill(clickedCellPosition, clickedColor, visited);

        // If there is a group of 3 or more, delete the group
        if (group.length >= 3) {
            deleteGroup(group);
        } else if (isLastInColumn(clickedCellPosition)) {
            // If the rectangle is isolated (no neighbors), delete it
            clickedCell.style.visibility = 'hidden'; // Make the cell invisible
            clickedCell.classList.add('invisible'); // Mark it as invisible
        }

        // After click, check for isolated groups of 3 and delete them
        findAndDeleteIsolatedGroups();
    });


    // Function to shuffle colors
    function shuffleColors() {
        const visibleCells = Array.from(gridContainer.children).filter(cell => !cell.classList.contains('invisible'));
        visibleCells.forEach(cell => {
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            cell.style.backgroundColor = randomColor;
        });
    }

    // Add event listener to the shuffle button
    shuffleButton.addEventListener('click', () => {
        shuffleColors();
        updateScore(-1);
    });

});