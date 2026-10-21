class ChessGame {
    constructor() {
        this.board = [];
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.validMoves = [];
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.gameStatus = 'playing';
        this.gameMode = null; // 'pvp' or 'pvcomputer'
        this.humanPlayer = 'white'; // Only used in pvcomputer mode
        this.difficulty = 'normal';
        this.theme = 'light';
        this.aiThinking = false;
        this.hintedMoves = null; // Store highlighted hint moves
        this.lastCheckState = { white: false, black: false }; // Track check state to avoid repeated vibrations
        this.promotionPending = null; // Store pawn promotion info
        
        // Track piece movements for castling and en passant
        this.pieceMoved = { white: { king: false, rook: [false, false] }, black: { king: false, rook: [false, false] } };
        this.lastPawnDoubleMove = null; // For en passant
        this.movesSinceCaptureOrPawn = 0; // For 50-move rule
        this.boardHistory = []; // For three-fold repetition
        
        this.pieces = {
            'white': {
                'king': '♔',
                'queen': '♕',
                'rook': '♖',
                'bishop': '♗',
                'knight': '♘',
                'pawn': '♙'
            },
            'black': {
                'king': '♚',
                'queen': '♛',
                'rook': '♜',
                'bishop': '♝',
                'knight': '♞',
                'pawn': '♟'
            }
        };

        this.coinGuess = null;
        this.coinChoiceOwner = 'player';

        this.pieceValues = {
            'pawn': 1,
            'knight': 3,
            'bishop': 3,
            'rook': 5,
            'queen': 9,
            'king': 1000
        };

        this.setupEventListeners();
        this.setTheme(this.theme);
        this.showModeSelection();
    }

    showModeSelection() {
        const modeScreen = document.getElementById('modeScreen');
        const gameScreen = document.getElementById('gameScreen');
        const moveHistorySection = document.getElementById('moveHistorySection');
        
        modeScreen.style.display = 'flex';
        gameScreen.style.display = 'none';
        moveHistorySection.style.display = 'none';
    }

    startGame(mode) {
        this.gameMode = mode;
        this.humanPlayer = 'white';
        this.initializeBoard();

        if (mode === 'pvcomputer') {
            this.coinChoiceOwner = Math.random() > 0.5 ? 'player' : 'computer';
        } else {
            this.coinChoiceOwner = 'player';
        }
        
        const modeScreen = document.getElementById('modeScreen');
        modeScreen.style.display = 'none';
        
        // Show coin flip to determine who goes first
        this.showCoinFlip();
    }

    showCoinFlip() {
        const coinFlipModal = document.getElementById('coinFlipModal');
        const coin = document.getElementById('coin');
        const coinResult = document.getElementById('coinResult');
        const coinChoiceText = document.querySelector('.coin-choice-text');
        const coinChoiceButtons = document.querySelector('.coin-choice-buttons');
        
        this.coinGuess = null;
        coinFlipModal.style.display = 'flex';
        coin.className = 'coin';
        coinResult.style.display = 'none';
        coinChoiceText.style.display = 'block';
        coinChoiceButtons.style.display = this.coinChoiceOwner === 'player' ? 'flex' : 'none';
        coinChoiceText.textContent = this.coinChoiceOwner === 'player'
            ? 'Pick HEADS or TAILS before flipping:'
            : 'Computer is choosing heads or tails...';
        
        this.currentPlayer = 'white';

        if (this.coinChoiceOwner === 'computer') {
            const computerChoice = Math.random() > 0.5 ? 'heads' : 'tails';
            setTimeout(() => {
                coinChoiceText.textContent = `Computer selected ${computerChoice.toUpperCase()}.`; 
                this.handleCoinChoice(computerChoice);
            }, 800);
        }
    }

    handleCoinChoice(choice) {
        const coin = document.getElementById('coin');
        const coinResult = document.getElementById('coinResult');
        const coinChoiceText = document.querySelector('.coin-choice-text');
        const coinChoiceButtons = document.querySelector('.coin-choice-buttons');

        this.coinGuess = choice;
        coinChoiceButtons.style.display = 'none';
        coinResult.style.display = 'none';
        coin.className = 'coin';

        const isHeads = Math.random() > 0.5;
        const flipClass = isHeads ? 'flip-heads' : 'flip-tails';
        const resultSide = isHeads ? 'heads' : 'tails';

        setTimeout(() => {
            coin.classList.add(flipClass);

            setTimeout(() => {
                const isPlayerChoice = this.coinChoiceOwner === 'player';
                let resultText;

                if (isPlayerChoice) {
                    resultText = `You picked ${choice.toUpperCase()}. Coin landed ${resultSide.toUpperCase()}. ${resultSide === choice ? 'You win the toss! You go first.' : 'You lose the toss. Computer goes first.'}`;
                    this.currentPlayer = resultSide === choice ? 'white' : 'black';
                } else {
                    resultText = `Computer picked ${choice.toUpperCase()}. Coin landed ${resultSide.toUpperCase()}. ${resultSide === choice ? 'Computer wins the toss and goes first.' : 'Computer loses the toss. You go first.'}`;
                    this.currentPlayer = resultSide === choice ? 'black' : 'white';
                }

                coinResult.textContent = resultText;
                coinResult.style.display = 'block';

                setTimeout(() => {
                    this.startGameAfterCoinFlip();
                }, 2000);
            }, 3000);
        }, 100);
    }

    startGameAfterCoinFlip() {
        const coinFlipModal = document.getElementById('coinFlipModal');
        const gameScreen = document.getElementById('gameScreen');
        const moveHistorySection = document.getElementById('moveHistorySection');
        
        coinFlipModal.style.display = 'none';
        gameScreen.style.display = 'grid';
        moveHistorySection.style.display = 'block';
        
        this.render();
        
        // If AI should play first (in PvC mode and AI is current player)
        if (this.gameMode === 'pvcomputer' && this.currentPlayer !== this.humanPlayer && this.gameStatus === 'playing') {
            setTimeout(() => this.makeAIMove(), 1000);
        }
    }

    initializeBoard() {
        this.board = Array(64).fill(null);
        
        // Setup black pieces (top of board)
        this.board[0] = { type: 'rook', color: 'black' };
        this.board[1] = { type: 'knight', color: 'black' };
        this.board[2] = { type: 'bishop', color: 'black' };
        this.board[3] = { type: 'queen', color: 'black' };
        this.board[4] = { type: 'king', color: 'black' };
        this.board[5] = { type: 'bishop', color: 'black' };
        this.board[6] = { type: 'knight', color: 'black' };
        this.board[7] = { type: 'rook', color: 'black' };
        
        // Black pawns
        for (let i = 8; i < 16; i++) {
            this.board[i] = { type: 'pawn', color: 'black' };
        }

        // White pawns (row 6)
        for (let i = 48; i < 56; i++) {
            this.board[i] = { type: 'pawn', color: 'white' };
        }
        
        // White pieces (bottom of board - row 7)
        this.board[56] = { type: 'rook', color: 'white' };
        this.board[57] = { type: 'knight', color: 'white' };
        this.board[58] = { type: 'bishop', color: 'white' };
        this.board[59] = { type: 'queen', color: 'white' };
        this.board[60] = { type: 'king', color: 'white' };
        this.board[61] = { type: 'bishop', color: 'white' };
        this.board[62] = { type: 'knight', color: 'white' };
        this.board[63] = { type: 'rook', color: 'white' };

        this.capturedPieces = { white: [], black: [] };
        this.gameStatus = 'playing';
        this.moveHistory = [];
        this.selectedSquare = null;
        this.validMoves = [];
        this.hintedMoves = null;
        this.lastCheckState = { white: false, black: false };
        
        // Reset piece movement tracking
        this.pieceMoved = { white: { king: false, rook: [false, false] }, black: { king: false, rook: [false, false] } };
        this.lastPawnDoubleMove = null;
        this.movesSinceCaptureOrPawn = 0;
        this.boardHistory = [JSON.stringify(this.board)];
    }

    getPieceSymbol(piece) {
        if (!piece) return '';
        return this.pieces[piece.color][piece.type];
    }

    indexToCoords(index) {
        return { row: Math.floor(index / 8), col: index % 8 };
    }

    coordsToIndex(row, col) {
        return row * 8 + col;
    }

    isValidIndex(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    getValidMoves(index) {
        const piece = this.board[index];
        if (!piece || piece.color !== this.currentPlayer) return [];

        const { row, col } = this.indexToCoords(index);
        let moves = [];

        switch (piece.type) {
            case 'pawn':
                moves = this.getPawnMoves(row, col);
                break;
            case 'knight':
                moves = this.getKnightMoves(row, col);
                break;
            case 'bishop':
                moves = this.getBishopMoves(row, col);
                break;
            case 'rook':
                moves = this.getRookMoves(row, col);
                break;
            case 'queen':
                moves = [...this.getRookMoves(row, col), ...this.getBishopMoves(row, col)];
                break;
            case 'king':
                moves = this.getKingMoves(row, col);
                break;
        }

        return moves.filter(moveIndex => {
            const testBoard = JSON.parse(JSON.stringify(this.board));
            testBoard[moveIndex] = testBoard[index];
            testBoard[index] = null;
            return !this.isKingInCheck(piece.color, testBoard);
        });
    }

    getPawnMoves(row, col) {
        const moves = [];
        const direction = this.currentPlayer === 'white' ? -1 : 1;
        const startRow = this.currentPlayer === 'white' ? 6 : 1;

        const forwardRow = row + direction;
        if (this.isValidIndex(forwardRow, col) && !this.board[this.coordsToIndex(forwardRow, col)]) {
            moves.push(this.coordsToIndex(forwardRow, col));

            if (row === startRow) {
                const doubleRow = row + 2 * direction;
                if (!this.board[this.coordsToIndex(doubleRow, col)]) {
                    moves.push(this.coordsToIndex(doubleRow, col));
                }
            }
        }

        // Regular captures
        for (let deltaCol of [-1, 1]) {
            const captureCol = col + deltaCol;
            if (this.isValidIndex(forwardRow, captureCol)) {
                const captureIndex = this.coordsToIndex(forwardRow, captureCol);
                const targetPiece = this.board[captureIndex];
                if (targetPiece && targetPiece.color !== this.currentPlayer) {
                    moves.push(captureIndex);
                }
            }
        }

        // En passant
        if (this.lastPawnDoubleMove) {
            const { fromRow, fromCol, toRow, toCol } = this.lastPawnDoubleMove;
            // Check if we're on the right row for en passant
            if (row === toRow && Math.abs(col - toCol) === 1) {
                // En passant is possible
                const enPassantTarget = this.coordsToIndex(toRow + direction, toCol);
                moves.push(enPassantTarget);
            }
        }

        return moves;
    }

    getKnightMoves(row, col) {
        const moves = [];
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        for (let [dRow, dCol] of knightMoves) {
            const newRow = row + dRow;
            const newCol = col + dCol;
            if (this.isValidIndex(newRow, newCol)) {
                const targetIndex = this.coordsToIndex(newRow, newCol);
                const targetPiece = this.board[targetIndex];
                if (!targetPiece || targetPiece.color !== this.currentPlayer) {
                    moves.push(targetIndex);
                }
            }
        }

        return moves;
    }

    getLineMoves(row, col, directions) {
        // Use provided board (for hypothetical/test boards) and pieceColor context
        // signature: getLineMoves(row, col, directions, board = this.board, pieceColor = this.currentPlayer)
        const moves = [];
        const board = arguments.length >= 4 && arguments[3] ? arguments[3] : this.board;
        const pieceColor = arguments.length >= 5 && arguments[4] ? arguments[4] : this.currentPlayer;

        for (let [dRow, dCol] of directions) {
            let r = row + dRow;
            let c = col + dCol;
            while (this.isValidIndex(r, c)) {
                const index = this.coordsToIndex(r, c);
                const piece = board[index];
                if (!piece) {
                    moves.push(index);
                } else {
                    if (piece.color !== pieceColor) {
                        moves.push(index);
                    }
                    break;
                }
                r += dRow;
                c += dCol;
            }
        }
        return moves;
    }

    getBishopMoves(row, col) {
        return this.getLineMoves(row, col, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
    }

    getRookMoves(row, col) {
        return this.getLineMoves(row, col, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
    }

    getKingMoves(row, col) {
        const moves = [];
        for (let dRow = -1; dRow <= 1; dRow++) {
            for (let dCol = -1; dCol <= 1; dCol++) {
                if (dRow === 0 && dCol === 0) continue;
                const newRow = row + dRow;
                const newCol = col + dCol;
                if (this.isValidIndex(newRow, newCol)) {
                    const index = this.coordsToIndex(newRow, newCol);
                    const piece = this.board[index];
                    if (!piece || piece.color !== this.currentPlayer) {
                        moves.push(index);
                    }
                }
            }
        }
        
        // Castling
        const castlingMoves = this.getCastlingMoves(row, col);
        moves.push(...castlingMoves);
        
        return moves;
    }

    getCastlingMoves(row, col) {
        const moves = [];
        
        // Check if king hasn't moved and is not in check
        if (this.pieceMoved[this.currentPlayer].king || this.isKingInCheck(this.currentPlayer)) {
            return moves;
        }

        const rookPositions = this.currentPlayer === 'white' ? [56, 63] : [0, 7];
        
        for (let i = 0; i < 2; i++) {
            const rookPos = rookPositions[i];
            const { row: rookRow, col: rookCol } = this.indexToCoords(rookPos);
            
            // Check if rook hasn't moved
            if (this.pieceMoved[this.currentPlayer].rook[i]) continue;
            
            const rook = this.board[rookPos];
            if (!rook || rook.type !== 'rook') continue;

            // Check if squares between king and rook are empty
            const minCol = Math.min(col, rookCol);
            const maxCol = Math.max(col, rookCol);
            let allEmpty = true;

            for (let checkCol = minCol + 1; checkCol < maxCol; checkCol++) {
                if (this.board[this.coordsToIndex(row, checkCol)]) {
                    allEmpty = false;
                    break;
                }
            }

            if (!allEmpty) continue;

            // Check if king doesn't pass through check
            const kingNewCol = i === 0 ? col - 2 : col + 2;
            let passesCheck = false;

            for (let checkCol = Math.min(col, kingNewCol); checkCol <= Math.max(col, kingNewCol); checkCol++) {
                const testBoard = JSON.parse(JSON.stringify(this.board));
                testBoard[this.coordsToIndex(row, checkCol)] = { type: 'king', color: this.currentPlayer };
                if (this.isKingInCheck(this.currentPlayer, testBoard)) {
                    passesCheck = true;
                    break;
                }
            }

            if (!passesCheck) {
                moves.push(this.coordsToIndex(row, kingNewCol));
            }
        }

        return moves;
    }

    findKing(color, board = this.board) {
        for (let i = 0; i < 64; i++) {
            const piece = board[i];
            if (piece && piece.type === 'king' && piece.color === color) {
                return i;
            }
        }
        return -1;
    }

    isKingInCheck(color, board = this.board) {
        const kingIndex = this.findKing(color, board);
        if (kingIndex === -1) return false;

        const opponent = color === 'white' ? 'black' : 'white';
        for (let i = 0; i < 64; i++) {
            const piece = board[i];
            if (piece && piece.color === opponent) {
                const moves = this.getMovesForPiece(i, piece, board);
                if (moves.includes(kingIndex)) {
                    return true;
                }
            }
        }
        return false;
    }

    getMovesForPiece(index, piece, board) {
        const { row, col } = this.indexToCoords(index);
        let moves = [];

        switch (piece.type) {
            case 'pawn':
                const direction = piece.color === 'white' ? -1 : 1;
                const forwardRow = row + direction;
                if (this.isValidIndex(forwardRow, col)) {
                    for (let deltaCol of [-1, 0, 1]) {
                        if (deltaCol === 0) continue;
                        const captureCol = col + deltaCol;
                        if (this.isValidIndex(forwardRow, captureCol)) {
                            const captureIndex = this.coordsToIndex(forwardRow, captureCol);
                            const targetPiece = board[captureIndex];
                            if (targetPiece) {
                                moves.push(captureIndex);
                            }
                        }
                    }
                }
                break;
            case 'knight':
                const knightMoves = [
                    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                    [1, -2], [1, 2], [2, -1], [2, 1]
                ];
                for (let [dRow, dCol] of knightMoves) {
                    const newRow = row + dRow;
                    const newCol = col + dCol;
                    if (this.isValidIndex(newRow, newCol)) {
                        moves.push(this.coordsToIndex(newRow, newCol));
                    }
                }
                break;
            case 'bishop':
                moves = this.getLineMoves(row, col, [[-1, -1], [-1, 1], [1, -1], [1, 1]], board, piece.color);
                break;
            case 'rook':
                moves = this.getLineMoves(row, col, [[-1, 0], [1, 0], [0, -1], [0, 1]], board, piece.color);
                break;
            case 'queen':
                moves = [...this.getLineMoves(row, col, [[-1, 0], [1, 0], [0, -1], [0, 1]], board, piece.color),
                         ...this.getLineMoves(row, col, [[-1, -1], [-1, 1], [1, -1], [1, 1]], board, piece.color)];
                break;
            case 'king':
                for (let dRow = -1; dRow <= 1; dRow++) {
                    for (let dCol = -1; dCol <= 1; dCol++) {
                        if (dRow === 0 && dCol === 0) continue;
                        const newRow = row + dRow;
                        const newCol = col + dCol;
                        if (this.isValidIndex(newRow, newCol)) {
                            moves.push(this.coordsToIndex(newRow, newCol));
                        }
                    }
                }
                break;
        }
        return moves;
    }

    isCheckmate() {
        if (!this.isKingInCheck(this.currentPlayer)) return false;

        for (let i = 0; i < 64; i++) {
            const piece = this.board[i];
            if (piece && piece.color === this.currentPlayer) {
                const moves = this.getValidMoves(i);
                if (moves.length > 0) {
                    return false;
                }
            }
        }
        return true;
    }

    isStalemate() {
        if (this.isKingInCheck(this.currentPlayer)) return false;

        for (let i = 0; i < 64; i++) {
            const piece = this.board[i];
            if (piece && piece.color === this.currentPlayer) {
                const moves = this.getValidMoves(i);
                if (moves.length > 0) {
                    return false;
                }
            }
        }
        return true;
    }

    isInsufficientMaterial() {
        // Determine insufficient material using actual board positions.
        // If any pawns, rooks or queens exist => sufficient material.
        const minorPieces = [];

        for (let i = 0; i < 64; i++) {
            const piece = this.board[i];
            if (!piece) continue;
            if (piece.type === 'pawn' || piece.type === 'rook' || piece.type === 'queen') {
                return false; // sufficient material
            }
            if (piece.type === 'bishop' || piece.type === 'knight') {
                minorPieces.push({ index: i, type: piece.type, color: piece.color });
            }
        }

        // No minors and no major pieces -> K vs K
        if (minorPieces.length === 0) return true;

        // Only one minor piece total -> K+minor vs K
        if (minorPieces.length === 1) return true;

        // Two minor pieces: cases to consider
        if (minorPieces.length === 2) {
            const [a, b] = minorPieces;
            // Two knights only -> insufficient
            if (a.type === 'knight' && b.type === 'knight') return true;

            // One knight + one bishop -> generally sufficient (could be mate with help), treat as sufficient
            if ((a.type === 'knight' && b.type === 'bishop') || (a.type === 'bishop' && b.type === 'knight')) return false;

            // Two bishops: if they are on same color squares -> insufficient
            if (a.type === 'bishop' && b.type === 'bishop') {
                const aCoords = this.indexToCoords(a.index);
                const bCoords = this.indexToCoords(b.index);
                const aColor = (aCoords.row + aCoords.col) % 2;
                const bColor = (bCoords.row + bCoords.col) % 2;
                if (aColor === bColor) return true;
                return false;
            }
        }

        // More than two minor pieces without pawns/majors: generally sufficient (e.g., K+N+N vs K is insufficient but covered above), treat as sufficient
        return false;
    }

    isFiftyMoveRule() {
        return this.movesSinceCaptureOrPawn >= 100; // 50 moves = 100 half-moves
    }

    isThreefoldRepetition() {
        if (this.boardHistory.length < 9) return false; // Need at least 9 moves (3 full moves)
        
        const currentBoard = JSON.stringify(this.board);
        let count = 0;
        
        for (let i = this.boardHistory.length - 1; i >= Math.max(0, this.boardHistory.length - 9); i--) {
            if (this.boardHistory[i] === currentBoard) {
                count++;
                if (count >= 3) return true;
            }
        }
        
        return false;
    }

    movePiece(fromIndex, toIndex) {
        const piece = this.board[fromIndex];
        const capturedPiece = this.board[toIndex];
        const { row: fromRow, col: fromCol } = this.indexToCoords(fromIndex);
        const { row: toRow, col: toCol } = this.indexToCoords(toIndex);

        // Track piece movements for castling
        if (piece.type === 'king') {
            this.pieceMoved[this.currentPlayer].king = true;
        } else if (piece.type === 'rook') {
            if (fromCol === 0) this.pieceMoved[this.currentPlayer].rook[0] = true;
            if (fromCol === 7) this.pieceMoved[this.currentPlayer].rook[1] = true;
        }

        // Handle castling
        if (piece.type === 'king' && Math.abs(toCol - fromCol) === 2) {
            // Move rook
            const rookFromCol = toCol > fromCol ? 7 : 0;
            const rookToCol = toCol > fromCol ? 5 : 3;
            const rookFromIndex = this.coordsToIndex(fromRow, rookFromCol);
            const rookToIndex = this.coordsToIndex(fromRow, rookToCol);
            
            this.board[rookToIndex] = this.board[rookFromIndex];
            this.board[rookFromIndex] = null;
        }

        // Handle en passant capture
        if (piece.type === 'pawn' && toCol !== fromCol && !capturedPiece) {
            // En passant
            const capturedPawnIndex = this.coordsToIndex(fromRow, toCol);
            this.capturedPieces[this.currentPlayer].push(this.board[capturedPawnIndex]);
            this.board[capturedPawnIndex] = null;
        }

        if (capturedPiece) {
            this.capturedPieces[this.currentPlayer].push(capturedPiece);
            
            // Check if king was captured
            if (capturedPiece.type === 'king') {
                this.board[toIndex] = piece;
                this.board[fromIndex] = null;
                
                const moveNotation = `${String.fromCharCode(97 + fromCol)}${8 - fromRow}-${String.fromCharCode(97 + toCol)}${8 - toRow}`;
                this.moveHistory.push({ notation: moveNotation, player: this.currentPlayer });
                
                this.gameStatus = 'king-captured';
                this.render();
                return;
            }
            this.movesSinceCaptureOrPawn = 0;
        } else {
            this.movesSinceCaptureOrPawn++;
        }

        this.board[toIndex] = piece;
        this.board[fromIndex] = null;

        const moveNotation = `${String.fromCharCode(97 + fromCol)}${8 - fromRow}-${String.fromCharCode(97 + toCol)}${8 - toRow}`;
        this.moveHistory.push({ notation: moveNotation, player: this.currentPlayer });

        // Handle pawn double move for en passant
        if (piece.type === 'pawn' && Math.abs(toRow - fromRow) === 2) {
            this.lastPawnDoubleMove = { fromRow, fromCol, toRow, toCol };
            this.movesSinceCaptureOrPawn = 0;
        } else {
            this.lastPawnDoubleMove = null;
        }

        // Handle pawn promotion
        if (piece.type === 'pawn' && (toRow === 0 || toRow === 7)) {
            this.promotionPending = { toIndex, color: this.currentPlayer };
            this.showPromotionModal();
            return;
        }

        // Track board state for three-fold repetition
        this.boardHistory.push(JSON.stringify(this.board));

        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

        // Check game end conditions
        if (this.isCheckmate()) {
            this.gameStatus = 'checkmate';
        } else if (this.isStalemate()) {
            this.gameStatus = 'stalemate';
        } else if (this.isThreefoldRepetition()) {
            this.gameStatus = 'three-fold-repetition';
        } else if (this.isFiftyMoveRule()) {
            this.gameStatus = 'fifty-move-rule';
        } else if (this.isInsufficientMaterial()) {
            this.gameStatus = 'insufficient-material';
        }

        this.selectedSquare = null;
        this.validMoves = [];
    }

    selectSquare(index) {
        // Don't allow moves if AI is thinking or game is finished
        if (this.aiThinking || this.gameStatus !== 'playing') return;

        const piece = this.board[index];
        
        // Deselect if clicking same square
        if (this.selectedSquare === index) {
            this.selectedSquare = null;
            this.validMoves = [];
            this.hintedMoves = null;
            this.render();
            return;
        }

        // Select a piece of current player
        if (piece && piece.color === this.currentPlayer) {
            this.selectedSquare = index;
            this.validMoves = this.getValidMoves(index);
            this.hintedMoves = null; // Clear hint when selecting a new piece
            this.render();
            return;
        }

        // Move piece if clicking valid move
        if (this.selectedSquare !== null && this.validMoves.includes(index)) {
            this.movePiece(this.selectedSquare, index);
            this.selectedSquare = null;
            this.validMoves = [];
            this.hintedMoves = null;
            this.render();

            // Make AI move if in PvC mode and it's AI's turn
            if (this.gameMode === 'pvcomputer' && this.currentPlayer !== this.humanPlayer && this.gameStatus === 'playing') {
                setTimeout(() => this.makeAIMove(), 800);
            }
            return;
        }

        this.render();
    }

    evaluateBoard(board) {
        let score = 0;
        for (let i = 0; i < 64; i++) {
            const piece = board[i];
            if (piece) {
                const value = this.pieceValues[piece.type];
                const positionBonus = this.getPositionBonus(i, piece);
                if (piece.color === 'black') {
                    score += value + positionBonus;
                } else {
                    score -= value + positionBonus;
                }
            }
        }
        return score;
    }

    getPositionBonus(index, piece) {
        const { row, col } = this.indexToCoords(index);
        let bonus = 0;

        if (piece.type === 'pawn') {
            bonus = Math.abs(row - (piece.color === 'white' ? 7 : 0)) * 0.5;
        } else if (piece.type === 'knight' || piece.type === 'bishop') {
            bonus = (3 - Math.abs(col - 3.5)) * 0.3 + (3 - Math.abs(row - 3.5)) * 0.3;
        }
        return bonus;
    }

    minimax(depth, isMaximizing, board, alpha, beta) {
        const savedBoard = JSON.parse(JSON.stringify(this.board));
        const savedCurrentPlayer = this.currentPlayer;
        this.board = board;

        if (depth === 0) {
            const score = this.evaluateBoard(board);
            this.board = savedBoard;
            this.currentPlayer = savedCurrentPlayer;
            return score;
        }

        const opponent = isMaximizing ? 'white' : 'black';
        this.currentPlayer = opponent;

        let allMoves = [];
        for (let i = 0; i < 64; i++) {
            const piece = board[i];
            if (piece && piece.color === opponent) {
                const moves = this.getValidMoves(i);
                for (let toIndex of moves) {
                    allMoves.push({ from: i, to: toIndex });
                }
            }
        }

        if (allMoves.length === 0) {
            const score = this.isKingInCheck(opponent, board) ? (isMaximizing ? -10000 : 10000) : 0;
            this.board = savedBoard;
            this.currentPlayer = savedCurrentPlayer;
            return score;
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (let move of allMoves) {
                const testBoard = JSON.parse(JSON.stringify(board));
                testBoard[move.to] = testBoard[move.from];
                testBoard[move.from] = null;
                const eval_ = this.minimax(depth - 1, false, testBoard, alpha, beta);
                maxEval = Math.max(maxEval, eval_);
                alpha = Math.max(alpha, eval_);
                if (beta <= alpha) break;
            }
            this.board = savedBoard;
            this.currentPlayer = savedCurrentPlayer;
            return maxEval;
        } else {
            let minEval = Infinity;
            for (let move of allMoves) {
                const testBoard = JSON.parse(JSON.stringify(board));
                testBoard[move.to] = testBoard[move.from];
                testBoard[move.from] = null;
                const eval_ = this.minimax(depth - 1, true, testBoard, alpha, beta);
                minEval = Math.min(minEval, eval_);
                beta = Math.min(beta, eval_);
                if (beta <= alpha) break;
            }
            this.board = savedBoard;
            this.currentPlayer = savedCurrentPlayer;
            return minEval;
        }
    }

    findBestMove() {
        let bestScore = -Infinity;
        let bestMoves = [];
        const aiDepth = this.getAIDepth();

        for (let i = 0; i < 64; i++) {
            const piece = this.board[i];
            if (piece && piece.color === 'black') {
                const moves = this.getValidMoves(i);
                for (let toIndex of moves) {
                    const testBoard = JSON.parse(JSON.stringify(this.board));
                    testBoard[toIndex] = testBoard[i];
                    testBoard[i] = null;

                    const score = this.minimax(aiDepth, false, testBoard, -Infinity, Infinity);
                    if (score > bestScore) {
                        bestScore = score;
                        bestMoves = [{ from: i, to: toIndex }];
                    } else if (score === bestScore) {
                        bestMoves.push({ from: i, to: toIndex });
                    }
                }
            }
        }

        if (bestMoves.length === 0) return null;
        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    makeAIMove() {
        if (this.gameStatus !== 'playing' || this.currentPlayer !== 'black') {
            return;
        }

        this.aiThinking = true;
        this.render();

        const bestMove = this.findBestMove();
        
        if (bestMove) {
            this.movePiece(bestMove.from, bestMove.to);
        }

        this.aiThinking = false;
        this.render();
    }

    showHint() {
        if (this.aiThinking || this.gameStatus !== 'playing') return;

        // Find best move for current player
        let bestScore = -Infinity;
        let bestMove = null;

        for (let i = 0; i < 64; i++) {
            const piece = this.board[i];
            if (piece && piece.color === this.currentPlayer) {
                const moves = this.getValidMoves(i);
                for (let toIndex of moves) {
                    const testBoard = JSON.parse(JSON.stringify(this.board));
                    testBoard[toIndex] = testBoard[i];
                    testBoard[i] = null;

                    // Simple evaluation
                    let score = this.evaluateBoard(testBoard);
                    
                    // Bonus for capturing
                    if (this.board[toIndex]) {
                        score += this.pieceValues[this.board[toIndex].type] * 2;
                    }

                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = { from: i, to: toIndex };
                    }
                }
            }
        }

        // Highlight the suggested move
        if (bestMove) {
            this.selectedSquare = bestMove.from;
            this.validMoves = [bestMove.to];
            this.hintedMoves = { from: bestMove.from, to: bestMove.to };
            this.render();
            
            // Auto-execute hint after 2 seconds if no action taken
            setTimeout(() => {
                if (this.hintedMoves && this.selectedSquare === bestMove.from && this.gameStatus === 'playing') {
                    this.movePiece(bestMove.from, bestMove.to);
                    this.hintedMoves = null;
                    this.render();
                    
                    // Make AI move if needed
                    if (this.gameMode === 'pvcomputer' && this.currentPlayer !== this.humanPlayer && this.gameStatus === 'playing') {
                        setTimeout(() => this.makeAIMove(), 800);
                    }
                }
            }, 2500);
        }
    }

    showPromotionModal() {
        const modal = document.getElementById('promotionModal');
        modal.style.display = 'flex';
    }

    completePawnPromotion(pieceType) {
        if (!this.promotionPending) return;

        const modal = document.getElementById('promotionModal');
        modal.style.display = 'none';

        const { toIndex, color } = this.promotionPending;
        this.board[toIndex] = { type: pieceType, color: color };
        this.movesSinceCaptureOrPawn = 0;

        // Track board state and change turn
        this.boardHistory.push(JSON.stringify(this.board));
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

        // Check game end conditions
        if (this.isCheckmate()) {
            this.gameStatus = 'checkmate';
        } else if (this.isStalemate()) {
            this.gameStatus = 'stalemate';
        } else if (this.isThreefoldRepetition()) {
            this.gameStatus = 'three-fold-repetition';
        } else if (this.isFiftyMoveRule()) {
            this.gameStatus = 'fifty-move-rule';
        } else if (this.isInsufficientMaterial()) {
            this.gameStatus = 'insufficient-material';
        }

        this.promotionPending = null;
        this.selectedSquare = null;
        this.validMoves = [];
        this.render();

        // AI move if needed
        if (this.gameMode === 'pvcomputer' && this.currentPlayer === 'black') {
            setTimeout(() => this.makeAIMove(), 500);
        }
    }

    setupEventListeners() {
        // Mode selection buttons
        document.getElementById('pvpBtn').addEventListener('click', () => {
            this.startGame('pvp');
        });

        document.getElementById('pvcomputerBtn').addEventListener('click', () => {
            this.startGame('pvcomputer');
        });

        // Game control buttons
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const selected = btn.getAttribute('data-difficulty');
                this.setDifficulty(selected);
            });
        });

        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const selected = btn.getAttribute('data-theme');
                this.setTheme(selected);
            });
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            this.initializeBoard();
            this.currentPlayer = 'white';
            this.gameStatus = 'playing';
            this.moveHistory = [];
            this.selectedSquare = null;
            this.validMoves = [];
            this.hintedMoves = null;
            this.render();
        });

        document.getElementById('chooseHeads').addEventListener('click', () => {
            this.handleCoinChoice('heads');
        });

        document.getElementById('chooseTails').addEventListener('click', () => {
            this.handleCoinChoice('tails');
        });

        document.getElementById('backBtn').addEventListener('click', () => {
            this.showModeSelection();
        });

        document.getElementById('hintBtn').addEventListener('click', () => {
            this.showHint();
        });

        // Pawn promotion buttons
        document.querySelectorAll('.promotion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const piece = e.target.getAttribute('data-piece');
                this.completePawnPromotion(piece);
            });
        });
    }

    setDifficulty(level) {
        if (!['normal', 'hard', 'expert'].includes(level)) return;
        this.difficulty = level;

        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.getAttribute('data-difficulty') === level);
        });
    }

    setTheme(theme) {
        if (!['light', 'dark', 'classic'].includes(theme)) return;
        this.theme = theme;

        document.body.classList.remove('light', 'dark', 'classic');
        document.body.classList.add(theme);

        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.getAttribute('data-theme') === theme);
        });
    }

    getAIDepth() {
        switch (this.difficulty) {
            case 'hard':
                return 3;
            case 'expert':
                return 4;
            default:
                return 2;
        }
    }

    render() {
        this.renderBoard();
        this.updateInfo();
    }

    renderBoard() {
        const boardElement = document.getElementById('board');
        if (!boardElement) return; // Safety check
        
        boardElement.innerHTML = '';

        for (let i = 0; i < 64; i++) {
            const square = document.createElement('div');
            const { row, col } = this.indexToCoords(i);
            const isWhiteSquare = (row + col) % 2 === 0;

            square.classList.add('square');
            square.classList.add(isWhiteSquare ? 'white' : 'black');

            if (this.selectedSquare === i) {
                square.classList.add('selected');
            }

            // Hint highlighting
            if (this.hintedMoves) {
                if (i === this.hintedMoves.from) {
                    square.classList.add('hint-from');
                } else if (i === this.hintedMoves.to) {
                    square.classList.add('hint-to');
                }
            }

            if (this.validMoves.includes(i)) {
                if (this.board[i]) {
                    square.classList.add('capture-move');
                } else {
                    square.classList.add('valid-move');
                }
            }

            const piece = this.board[i];
            if (piece) {
                square.textContent = this.getPieceSymbol(piece);
                
                // Highlight king if in check
                if (piece.type === 'king' && this.isKingInCheck(piece.color)) {
                    square.classList.add('king-in-check');
                }
            }

            // Always attach click listener
            const squareIndex = i;
            square.addEventListener('click', () => {
                if (!this.aiThinking && this.gameStatus === 'playing') {
                    this.hintedMoves = null; // Clear hint on any click
                    this.selectSquare(squareIndex);
                }
            });

            square.style.cursor = this.aiThinking || this.gameStatus !== 'playing' ? 'not-allowed' : 'pointer';
            square.style.opacity = this.gameStatus !== 'playing' ? '0.6' : '1';
            boardElement.appendChild(square);
        }
    }

    updateInfo() {
        // Update current turn
        const turnElement = document.getElementById('currentTurn');
        let turnText = this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1);
        
        if (this.gameMode === 'pvcomputer') {
            if (this.currentPlayer === 'black') {
                turnText += ' (Computer)';
            } else {
                turnText += ' (You)';
            }
        }

        turnElement.textContent = turnText;
        turnElement.className = this.currentPlayer === 'white' ? 'white-text' : 'black-text';

        // Update game mode display
        const modeElement = document.getElementById('gameMode');
        if (this.gameMode === 'pvp') {
            modeElement.textContent = '👥 Player vs Player';
        } else {
            modeElement.textContent = `🤖 Player vs Computer (${this.difficulty.charAt(0).toUpperCase() + this.difficulty.slice(1)})`;
        }

        // Update game status
        const statusElement = document.getElementById('gameStatus');
        if (this.aiThinking) {
            statusElement.innerHTML = 'Computer thinking <span class="thinking-indicator">...</span>';
        } else if (this.gameStatus === 'king-captured') {
            const winner = this.currentPlayer === 'white' ? 'White' : 'Black';
            statusElement.innerHTML = `🏆 <strong>${winner} Wins!</strong> 👑 King Captured! 👑`;
            statusElement.style.color = '#27ae60';
            statusElement.style.fontSize = '1.2em';
        } else if (this.gameStatus === 'checkmate') {
            const winner = this.currentPlayer === 'white' ? 'Black' : 'White';
            statusElement.textContent = `Checkmate! ${winner} wins!`;
        } else if (this.gameStatus === 'stalemate') {
            statusElement.textContent = 'Draw! Stalemate!';
        } else if (this.gameStatus === 'three-fold-repetition') {
            statusElement.textContent = 'Draw! Three-fold Repetition!';
        } else if (this.gameStatus === 'fifty-move-rule') {
            statusElement.textContent = 'Draw! Fifty-Move Rule!';
        } else if (this.gameStatus === 'insufficient-material') {
            statusElement.textContent = 'Draw! Insufficient Material!';
        } else {
            statusElement.textContent = 'Playing';
            statusElement.style.color = '';
            statusElement.style.fontSize = '';
        }

        // Check warning
        const checkWarning = document.getElementById('checkWarning');
        if (this.isKingInCheck(this.currentPlayer)) {
            checkWarning.textContent = '🚨 ⚠️ YOUR KING IS IN CHECK! ⚠️ 🚨';
            checkWarning.style.animation = 'check-warning-pulse 0.5s infinite';
            
            // Trigger vibration alert
            this.triggerCheckVibration();
        } else {
            checkWarning.textContent = '';
            checkWarning.style.animation = 'none';
        }

        // Display move counter for 50-move rule
        const moveCounter = document.getElementById('moveCounter');
        if (this.movesSinceCaptureOrPawn > 0) {
            const movesForDraw = Math.ceil(this.movesSinceCaptureOrPawn / 2);
            moveCounter.textContent = `Moves since capture/pawn: ${movesForDraw}/50 (Draw possible at 50)`;
        } else {
            moveCounter.textContent = '';
        }

        this.updateCapturedPieces();
        this.updateMoveHistory();
    }

    triggerCheckVibration() {
        // Only trigger if check state just changed
        const isCurrentKingInCheck = this.isKingInCheck(this.currentPlayer);
        
        if (isCurrentKingInCheck && !this.lastCheckState[this.currentPlayer]) {
            // King just got into check - trigger vibration and sound
            if (navigator.vibrate) {
                // Pattern: vibrate for 200ms, pause 100ms, vibrate for 200ms
                navigator.vibrate([200, 100, 200]);
            }
            
            // Play alert sound
            this.playCheckSound();
        }
        
        // Update check state
        this.lastCheckState[this.currentPlayer] = isCurrentKingInCheck;
    }

    playCheckSound() {
        // Simple beep sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800; // Hz
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            // Audio context not supported or blocked
        }
    }

    updateCapturedPieces() {
        const whiteCaptured = document.getElementById('whiteCaptured');
        const blackCaptured = document.getElementById('blackCaptured');

        whiteCaptured.innerHTML = this.capturedPieces.black
            .map(piece => `<span class="piece-item">${this.getPieceSymbol(piece)}</span>`)
            .join('');

        blackCaptured.innerHTML = this.capturedPieces.white
            .map(piece => `<span class="piece-item">${this.getPieceSymbol(piece)}</span>`)
            .join('');
    }

    updateMoveHistory() {
        const moveHistory = document.getElementById('moveHistory');
        moveHistory.innerHTML = this.moveHistory
            .map((move, index) => `<div class="move-item ${move.player}">${index + 1}. ${move.notation}</div>`)
            .join('');

        moveHistory.scrollTop = moveHistory.scrollHeight;
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChessGame();
});
