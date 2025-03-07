const gameBoard = document.getElementById('game-board');
const currentScoreElement = document.getElementById('current-score');
const highScoreElement = document.getElementById('high-score');
const tetrisTheme = document.getElementById('tetris-theme');
let currentScore = 0;
let highScore = 0;

// Game constants
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const CELL_SIZE = 20;

// Game state
let board = [];
let boardColors = [];
let currentPiece = null;
let currentPieceColor = null;
let nextPiece = null;
let nextPieceColor = null;
let currentPiecePosition = { x: 0, y: 0 };
let gameLoop = null;

// Tetromino shapes and their colors
const TETROMINOES = {
    'I': {
        shape: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        color: '#00ffff' // cyan
    },
    'T': {
        shape: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#ff00ff' // magenta
    },
    'L': {
        shape: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#ffa500' // orange
    },
    'J': {
        shape: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#0000ff' // blue
    },
    'O': {
        shape: [
            [1, 1],
            [1, 1]
        ],
        color: '#ffff00' // yellow
    },
    'S': {
        shape: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        color: '#00ff00' // green
    },
    'Z': {
        shape: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ],
        color: '#ff0000' // red
    }
};

function createBoard() {
    gameBoard.style.width = BOARD_WIDTH * CELL_SIZE + 'px';
    gameBoard.style.height = BOARD_HEIGHT * CELL_SIZE + 'px';
    gameBoard.style.display = 'grid';
    gameBoard.style.gridTemplate = `repeat(${BOARD_HEIGHT}, ${CELL_SIZE}px) / repeat(${BOARD_WIDTH}, ${CELL_SIZE}px)`;
    
    board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
    boardColors = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(null));
    
    // Clear existing cells
    while (gameBoard.firstChild) {
        gameBoard.removeChild(gameBoard.firstChild);
    }
    
    // Create new cells
    for (let i = 0; i < BOARD_HEIGHT; i++) {
        for (let j = 0; j < BOARD_WIDTH; j++) {
            const cell = document.createElement('div');
            cell.style.border = '1px solid #0f0';
            cell.style.boxSizing = 'border-box';
            gameBoard.appendChild(cell);
        }
    }
}

function createNextPiecePreview() {
    const previewBoard = document.getElementById('next-piece-preview');
    previewBoard.style.display = 'grid';
    
    // Clear existing cells
    while (previewBoard.firstChild) {
        previewBoard.removeChild(previewBoard.firstChild);
    }
    
    // Create new cells
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            const cell = document.createElement('div');
            cell.style.border = '1px solid #0f0';
            cell.style.boxSizing = 'border-box';
            previewBoard.appendChild(cell);
        }
    }
}

function drawNextPiecePreview() {
    if (!nextPiece) return;
    
    const previewBoard = document.getElementById('next-piece-preview');
    const cells = previewBoard.children;
    
    // Clear all cells
    for (let i = 0; i < 16; i++) {
        cells[i].style.backgroundColor = '#111';
        cells[i].style.boxShadow = 'none';
    }
    
    // Calculate offset to center the piece
    const offsetY = Math.floor((4 - nextPiece.length) / 2);
    const offsetX = Math.floor((4 - nextPiece[0].length) / 2);
    
    // Draw the next piece
    for (let y = 0; y < nextPiece.length; y++) {
        for (let x = 0; x < nextPiece[y].length; x++) {
            if (nextPiece[y][x]) {
                const index = (y + offsetY) * 4 + (x + offsetX);
                if (index >= 0 && index < cells.length) {
                    cells[index].style.backgroundColor = nextPieceColor;
                    cells[index].style.boxShadow = `0 0 5px ${nextPieceColor}`;
                }
            }
        }
    }
}

function drawBoard() {
    const cells = gameBoard.children;
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            const cell = cells[y * BOARD_WIDTH + x];
            cell.style.backgroundColor = board[y][x] ? '#0f0' : '#111';
            // Add neon glow effect to active cells
            cell.style.boxShadow = board[y][x] ? '0 0 5px #0f0' : 'none';
        }
    }
}

function createNewPiece() {
    // If there's no next piece, create both current and next
    if (!nextPiece) {
        const pieces = Object.keys(TETROMINOES);
        const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
        currentPiece = TETROMINOES[randomPiece].shape;
        currentPieceColor = TETROMINOES[randomPiece].color;
        
        const nextRandomPiece = pieces[Math.floor(Math.random() * pieces.length)];
        nextPiece = TETROMINOES[nextRandomPiece].shape;
        nextPieceColor = TETROMINOES[nextRandomPiece].color;
    } else {
        // Use the next piece as current and create a new next piece
        currentPiece = nextPiece;
        currentPieceColor = nextPieceColor;
        
        const pieces = Object.keys(TETROMINOES);
        const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
        nextPiece = TETROMINOES[randomPiece].shape;
        nextPieceColor = TETROMINOES[randomPiece].color; // This was using nextRandomPiece which didn't exist
    }
    
    currentPiecePosition = {
        x: Math.floor((BOARD_WIDTH - currentPiece[0].length) / 2),
        y: 0
    };
    
    drawNextPiecePreview();
}

function canMove(newX, newY, rotatedPiece = currentPiece) {
    for (let y = 0; y < rotatedPiece.length; y++) {
        for (let x = 0; x < rotatedPiece[y].length; x++) {
            if (rotatedPiece[y][x]) {
                const nextX = newX + x;
                const nextY = newY + y;
                if (nextX < 0 || nextX >= BOARD_WIDTH || nextY >= BOARD_HEIGHT) {
                    return false;
                }
                if (nextY >= 0 && board[nextY][nextX]) {
                    return false;
                }
            }
        }
    }
    return true;
}

function rotatePiece() {
    const rotated = currentPiece[0].map((_, i) =>
        currentPiece.map(row => row[i]).reverse()
    );
    
    if (canMove(currentPiecePosition.x, currentPiecePosition.y, rotated)) {
        currentPiece = rotated;
        drawGame();
    }
}

function mergePiece() {
    for (let y = 0; y < currentPiece.length; y++) {
        for (let x = 0; x < currentPiece[y].length; x++) {
            if (currentPiece[y][x]) {
                const boardY = currentPiecePosition.y + y;
                if (boardY >= 0) {
                    board[boardY][currentPiecePosition.x + x] = 1;
                    boardColors[boardY][currentPiecePosition.x + x] = currentPieceColor;
                }
            }
        }
    }
}

function clearLines() {
    let linesCleared = 0;
    let linesToClear = [];

    // First pass: identify completed lines
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
        if (board[y].every(cell => cell === 1)) {
            linesToClear.push(y);
            linesCleared++;
        }
    }

    if (linesCleared > 0) {
        // Add explosion animation to completed lines
        const cells = gameBoard.children;
        linesToClear.forEach(y => {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                const cell = cells[y * BOARD_WIDTH + x];
                const color = boardColors[y][x];
                cell.style.backgroundColor = color || '#0f0';
                cell.style.border = '1px solid #0f0';
                cell.classList.add(linesCleared > 1 ? 'exploding-line-multi' : 'exploding-line');
            }
        });

        // Wait for animation to complete before removing lines
        setTimeout(() => {
            // Remove the animation classes first
            linesToClear.forEach(y => {
                for (let x = 0; x < BOARD_WIDTH; x++) {
                    const cell = cells[y * BOARD_WIDTH + x];
                    cell.classList.remove('exploding-line', 'exploding-line-multi');
                }
            });

            // Remove the lines from bottom to top to avoid skipping lines
            linesToClear.sort((a, b) => b - a).forEach(y => {
                // Remove the line
                board.splice(y, 1);
                boardColors.splice(y, 1);
                // Add new empty line at top
                board.unshift(Array(BOARD_WIDTH).fill(0));
                boardColors.unshift(Array(BOARD_WIDTH).fill(null));
            });
            
            updateScore(linesCleared);
            playLineClearSound(linesCleared);
            
            // Redraw the entire game board to ensure proper grid visibility
            drawGame();
            
            // Ensure all cells have the grid lines
            for (let i = 0; i < cells.length; i++) {
                cells[i].style.border = '1px solid #0f0';
            }
        }, linesCleared > 1 ? 800 : 500);
    }
}

function updateScore(linesCleared) {
    // Score system: 100 points for 1 line, 300 for 2, 500 for 3, 800 for 4
    const scoreMultipliers = [0, 100, 300, 500, 800];
    currentScore += scoreMultipliers[linesCleared] || 0;
    currentScoreElement.textContent = currentScore;
    if (currentScore > highScore) {
        highScore = currentScore;
        highScoreElement.textContent = highScore;
    }
}

function drawGame() {
    // Create temporary boards for drawing
    let tempBoard = board.map(row => [...row]);
    let tempColors = boardColors.map(row => [...row]);
    
    // Draw current piece on temporary board
    for (let y = 0; y < currentPiece.length; y++) {
        for (let x = 0; x < currentPiece[y].length; x++) {
            if (currentPiece[y][x]) {
                const boardY = currentPiecePosition.y + y;
                if (boardY >= 0) {
                    tempBoard[boardY][currentPiecePosition.x + x] = 1;
                    tempColors[boardY][currentPiecePosition.x + x] = currentPieceColor;
                }
            }
        }
    }
    
    // Update display with temporary board
    const cells = gameBoard.children;
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            const cell = cells[y * BOARD_WIDTH + x];
            const color = tempColors[y][x];
            cell.style.backgroundColor = tempBoard[y][x] ? (color || '#0f0') : '#111';
            cell.style.boxShadow = tempBoard[y][x] ? `0 0 5px ${color || '#0f0'}` : 'none';
        }
    }
}

function moveDown() {
    if (canMove(currentPiecePosition.x, currentPiecePosition.y + 1)) {
        currentPiecePosition.y++;
        drawGame();
        return true;
    }
    
    // If we can't move down, merge the piece into the board
    mergePiece();
    clearLines();
    createNewPiece();
    
    // Check for game over
    if (!canMove(currentPiecePosition.x, currentPiecePosition.y)) {
        gameOver();
        return false;
    }
    
    drawGame();
    return false;
}

function gameOver() {
    clearInterval(gameLoop);
    tetrisTheme.pause(); // Stop the music
    alert('Game Over! Your score: ' + currentScore);
}

function handleKeyPress(event) {
    switch(event.key) {
        case 'ArrowLeft':
            if (canMove(currentPiecePosition.x - 1, currentPiecePosition.y)) {
                currentPiecePosition.x--;
                drawGame();
            }
            break;
        case 'ArrowRight':
            if (canMove(currentPiecePosition.x + 1, currentPiecePosition.y)) {
                currentPiecePosition.x++;
                drawGame();
            }
            break;
        case 'ArrowDown':
            moveDown();
            break;
        case ' ':
            rotatePiece();
            break;
    }
}

let isMusicEnabled = true;
let isSoundEnabled = true;  // Add this line near the top with other state variables

function playLineClearSound(linesCleared) {
    if (!isSoundEnabled || !isMusicEnabled) return;  // Only play if sound and music are enabled
    
    const sound = document.getElementById(`line-clear-${Math.min(linesCleared, 4)}`);
    if (sound) {
        sound.currentTime = 0;  // Reset the sound to start
        sound.play().catch(error => console.log("Audio playback failed:", error));
    }
}

function toggleMusic() {
    const musicButton = document.getElementById('music-toggle');
    isMusicEnabled = !isMusicEnabled;
    isSoundEnabled = isMusicEnabled;  // Sound effects follow music toggle
    
    if (isMusicEnabled) {
        tetrisTheme.play();
        musicButton.innerHTML = '🔊 Music On';
    } else {
        tetrisTheme.pause();
        musicButton.innerHTML = '🔈 Music Off';
    }
}

function startGame() {
    // Change button text from Start to Restart
    const restartButton = document.getElementById('restart-button');
    restartButton.textContent = 'Restart';
    restartButton.onclick = restartGame;

    // Clear the board and colors
    board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
    boardColors = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(null));
    createBoard();
    createNextPiecePreview();
    nextPiece = null; // Reset next piece
    createNewPiece();
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(() => moveDown(), 1000);
    document.addEventListener('keydown', handleKeyPress);
    drawGame();
    
    // Start the music if enabled
    if (isMusicEnabled) {
        tetrisTheme.currentTime = 0;
        tetrisTheme.play().catch(error => console.log("Audio playback failed:", error));
    }
}

function restartGame() {
    currentScore = 0;
    currentScoreElement.textContent = currentScore;
    board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
    if (isMusicEnabled) {
        tetrisTheme.currentTime = 0;
        tetrisTheme.play().catch(error => console.log("Audio playback failed:", error));
    }
    startGame();
}

// Add a function to start music that can be called on user interaction
function startMusic() {
    const musicButton = document.getElementById('music-start');
    tetrisTheme.play().then(() => {
        musicButton.style.display = 'none';
    }).catch(error => {
        console.log("Audio playback failed:", error);
    });
}

// Initialize the game board without starting
document.getElementById('music-toggle').addEventListener('click', toggleMusic);
createBoard();
createNextPiecePreview();