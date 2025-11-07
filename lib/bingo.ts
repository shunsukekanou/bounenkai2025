// bounenkai2025-app/lib/bingo.ts

/**
 * Represents a single square on the bingo card.
 */
export interface BingoSquare {
  number: number | 'FREE';
  marked: boolean;
}

/**
 * Represents a full 5x5 bingo card.
 * The structure is a 2D array of rows, where each row is an array of squares.
 */
export type BingoCardData = BingoSquare[][];

// Helper function to get a specified number of unique random numbers from a range.
const getUniqueRandomNumbers = (min: number, max: number, count: number): number[] => {
  const numbers: number[] = [];
  while (numbers.length < count) {
    const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
    if (!numbers.includes(randomNum)) {
      numbers.push(randomNum);
    }
  }
  return numbers;
};

/**
 * Generates a standard 5x5 bingo card data structure.
 * B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75
 * The center square is always 'FREE'.
 * @returns {BingoCardData} A 2D array representing the bingo card.
 */
export const generateBingoCard = (): BingoCardData => {
  const cardColumns: BingoSquare[][] = [];

  const columnRules = [
    { min: 1, max: 15, count: 5 },  // B
    { min: 16, max: 30, count: 5 }, // I
    { min: 31, max: 45, count: 4 }, // N (4 numbers + 1 FREE space)
    { min: 46, max: 60, count: 5 }, // G
    { min: 61, max: 75, count: 5 }, // O
  ];

  columnRules.forEach(({ min, max, count }, colIndex) => {
    const columnNumbers = getUniqueRandomNumbers(min, max, count);
    const column: BingoSquare[] = [];
    
    let numIndex = 0;
    for (let rowIndex = 0; rowIndex < 5; rowIndex++) {
      if (colIndex === 2 && rowIndex === 2) {
        column.push({ number: 'FREE', marked: true });
      } else {
        column.push({ number: columnNumbers[numIndex++], marked: false });
      }
    }
    cardColumns.push(column);
  });

  // Transpose the columns into rows for a standard card layout
  const cardRows: BingoCardData = Array(5).fill(null).map((_, rowIndex) => 
    Array(5).fill(null).map((_, colIndex) => cardColumns[colIndex][rowIndex])
  );

  return cardRows;
};

/**
 * Generates a specified number of unique bingo cards.
 * This is a simple implementation and may be slow for very large numbers of cards.
 * For a large-scale app, a more robust uniqueness check against a database would be needed.
 * @param count The number of unique cards to generate.
 * @returns {BingoCardData[]} An array of unique bingo cards.
 */
export const generateUniqueBingoCards = (count: number): BingoCardData[] => {
    const cards: BingoCardData[] = [];
    const cardStrings = new Set<string>();

    while (cards.length < count) {
        const newCard = generateBingoCard();
        // Convert card to a string representation for easy uniqueness checking.
        const cardString = JSON.stringify(newCard.map(row => row.map(sq => sq.number)));

        if (!cardStrings.has(cardString)) {
            cardStrings.add(cardString);
            cards.push(newCard);
        }
    }

    return cards;
}

/**
 * Checks a bingo card for a winning line (5 marked squares in a row, column, or diagonal).
 * @param card The BingoCardData to check.
 * @returns {boolean} True if a bingo is found, false otherwise.
 */
export const checkBingo = (card: BingoCardData): boolean => {
  // Check rows for a win
  for (let i = 0; i < 5; i++) {
    if (card[i].every(square => square.marked)) {
      return true;
    }
  }

  // Check columns for a win
  for (let i = 0; i < 5; i++) {
    if (card.every(row => row[i].marked)) {
      return true;
    }
  }

  // Check diagonal (top-left to bottom-right)
  if (Array.from({ length: 5 }, (_, i) => card[i][i]).every(square => square.marked)) {
    return true;
  }

  // Check anti-diagonal (top-right to bottom-left)
  if (Array.from({ length: 5 }, (_, i) => card[i][4 - i]).every(square => square.marked)) {
    return true;
  }

  return false;
};
