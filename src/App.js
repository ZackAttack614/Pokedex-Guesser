import React, { useState, useEffect } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import axios from 'axios';
import Confetti from 'react-confetti';
import './App.css';

function App() {
  const [pokemonList, setPokemonList] = useState([]);
  const [pokemonName, setPokemonName] = useState('');
  const [pokedexEntries, setPokedexEntries] = useState([]);
  const [translatedEntry, setTranslatedEntry] = useState('');
  const [userGuess, setUserGuess] = useState('');
  const [message, setMessage] = useState('');
  const [language, setLanguage] = useState('es');
  const [attempts, setAttempts] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [originalEntry, setOriginalEntry] = useState('');
  const [pokemonSprite, setPokemonSprite] = useState('');
  const [loading, setLoading] = useState(false);
  const [generation, setGeneration] = useState('1');
  const [incorrectGuesses, setIncorrectGuesses] = useState([]);
  const [scores, setScores] = useState({});
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    loadScores();
    getRandomPokemon();
  }, [generation]);

  useEffect(() => {
    if (originalEntry) {
      getTranslatedEntry(originalEntry, language);
    }
  }, [language, originalEntry]);

  const loadScores = () => {
    const savedScores = JSON.parse(localStorage.getItem('pokemonScores')) || {};
    setScores(savedScores);
  };

  const saveScores = (newScores) => {
    localStorage.setItem('pokemonScores', JSON.stringify(newScores));
  };

  const updateScores = (isWin) => {
    const newScores = { ...scores };
    if (!newScores[generation]) {
      newScores[generation] = { wins: 0, losses: 0 };
    }
    if (isWin) {
      newScores[generation].wins += 1;
    } else {
      newScores[generation].losses += 1;
    }
    setScores(newScores);
    saveScores(newScores);
  };

  const fillPokemonList = async (generations) => {
    const totalList = [];
    for (const generation of generations) {
      const response = await axios.get(`https://pokeapi.co/api/v2/generation/${generation}`);
      const data = response.data.pokemon_species.map(pokemon => pokemon.name.split(/-(m|f)$/)[0]);
      totalList.push(...data);
    }
    totalList.sort();
    setPokemonList(totalList.filter((item, index) => index === 0 || item !== totalList[index - 1]));
  };

  const getRandomPokemon = async () => {
    const generationResponse = await axios.get(`https://pokeapi.co/api/v2/generation/${generation}`);
    const pokemonSpecies = generationResponse.data.pokemon_species;
    const randomPokemon = pokemonSpecies[Math.floor(Math.random() * pokemonSpecies.length)];
    const randomId = randomPokemon.url.split('/')[6];
    const response = await axios.get(`https://pokeapi.co/api/v2/pokemon-species/${randomId}`);
    const data = response.data;
    const name = data.name;
    const entries = data.flavor_text_entries;
    const allEnglishEntries = entries.filter(entry => entry.language.name === 'en');
    let keptEntries = allEnglishEntries.filter(entry => entry.flavor_text.toLowerCase().indexOf(name) === -1);
    if (keptEntries.length === 0)
      keptEntries = allEnglishEntries;
    const englishEntry = keptEntries[Math.floor(Math.random() * keptEntries.length)].flavor_text.replace(/\s+/g, ' ');

    const spriteResponse = await axios.get(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
    const sprite = spriteResponse.data.sprites.front_default;

    setPokemonName(name);
    setPokedexEntries(entries);
    setOriginalEntry(englishEntry);
    setPokemonSprite(sprite);
    resetGame();
  };

  const getTranslatedEntry = async (text, target_language) => {
    try {
      setLoading(true);
      const response = await axios.post('https://translation-service-csohi2q64q-uc.a.run.app/translate', {
        text: text,
        target_language: target_language
      });
      setTranslatedEntry(response.data.translation);
    } catch (error) {
      console.error('Error translating text:', error);
      setTranslatedEntry('Translation not available.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuess = () => {
    let guess = document.getElementById('user-guess').value.toLowerCase().trim();
    setUserGuess(guess);
    if (!pokemonList.includes(guess)) {
      alert('Invalid Pokémon name for this generation');
      return;
    }

    if (incorrectGuesses.includes(guess)) {
      setMessage(`You already guessed ${guess}. Try a different one.`);
      return;
    }

    if (guess === pokemonName.split(/-(m|f)$/)[0].toLowerCase()) {
      setMessage(`Correct! The Pokémon is ${pokemonName}.`);
      setShowConfetti(true);
      setGameOver(true);
      updateScores(true);
    } else {
      setAttempts(attempts - 1);
      setIncorrectGuesses([...incorrectGuesses, guess]);
      if (attempts > 1) {
        setMessage('Incorrect. Try again.');
      } else {
        setMessage(`No more guesses! The Pokémon was ${pokemonName}.`);
        setGameOver(true);
        updateScores(false);
      }
    }
  };

  const handleGiveUp = () => {
    setMessage(`You gave up! The Pokémon was ${pokemonName}.`);
    setGameOver(true);
    updateScores(false);
  };

  const handleRestart = () => {
    setShowConfetti(false);
    getRandomPokemon();
  };

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  const handleGenerationChange = (e) => {
    setGeneration(e.target.value);
  };

  const handleInputChange = (e, newValue) => {
    setUserGuess(newValue);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setTimeout(handleGuess, 0);
    }
  };

  const resetGame = () => {
    fillPokemonList([generation]);
    setUserGuess('');
    setMessage('');
    setAttempts(3);
    setGameOver(false);
    setIncorrectGuesses([]);
  };

  const calculateSuccessRate = (wins, losses) => {
    const total = wins + losses;
    if (total === 0) return '0/0';
    return `${wins}/${total}`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      {showConfetti && <Confetti />}
      <h1 className="text-4xl font-bold mb-6">Pokédex Guesser</h1>
      <p className="text-lg mb-4">Translate the Pokédex entry and guess the Pokémon!</p>
      <label className="mb-4">
        <span className="mr-2">Language:</span>
        <select value={language} onChange={handleLanguageChange} className="border p-2 rounded">
          <option value="es">Spanish</option>
          <option value="de">German</option>
          <option value="it">Italian</option>
          <option value="fr">French</option>
          <option value="ar">Arabic</option>
          <option value="hi">Hindi</option>
          <option value="ja">Japanese</option>
          <option value="ru">Russian</option>
          <option value="he">Hebrew</option>
          <option value="la">Latin</option>
          <option value="zz">Mangled English</option>
          <option value="en">Wimpy Normal English</option>
        </select>
      </label>
      <label className="mb-4">
        <span className="mr-2">Generation:</span>
        <select value={generation} onChange={handleGenerationChange} className="border p-2 rounded">
          <option value="1">Generation 1</option>
          <option value="2">Generation 2</option>
          <option value="3">Generation 3</option>
          <option value="4">Generation 4</option>
          <option value="5">Generation 5</option>
          <option value="6">Generation 6</option>
          <option value="7">Generation 7</option>
          <option value="8">Generation 8</option>
        </select>
      </label>
      <div className="bg-white p-4 rounded shadow-md mb-4" style={{ minHeight: '100px' }}>
        <p>{translatedEntry}</p>
      </div>
      <Autocomplete
        disablePortal
        onChange={handleInputChange}
        value={userGuess}
        disabled={gameOver}
        onKeyDown={handleKeyDown}
        id="user-guess"
        options={pokemonList}
        sx={{ width: 300, marginBottom: 2 }}
        renderInput={(params) => <TextField {...params} label="Your guess" />}
      />
      <div className="flex space-x-4 mb-4">
        <button onClick={handleGuess} disabled={gameOver || userGuess === ''} className={`bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700 ${gameOver || userGuess === '' ? 'opacity-50 cursor-not-allowed' : ''}`}>
          Guess
        </button>
        <button onClick={handleGiveUp} disabled={gameOver} className={`bg-red-500 text-white px-4 py-2 rounded hover:bg-red-700 ${gameOver ? 'opacity-50 cursor-not-allowed' : ''}`}>
          Give Up
        </button>
        <button onClick={handleRestart} disabled={!gameOver} className={`bg-green-500 text-white px-4 py-2 rounded hover:bg-green-700 ${!gameOver ? 'opacity-50 cursor-not-allowed' : ''}`}>
          Restart
        </button>
      </div>
      <p className="text-lg mt-4">{message}</p>
      <p className="text-lg mt-2">Attempts Left: {attempts}</p>
      <div className="flex flex-col items-center mt-4" style={{ minHeight: '160px' }}>
        {loading ? (
          <div className="loader"></div>
        ) : (
          gameOver && (
            <>
              <img src={pokemonSprite} alt={pokemonName} className="w-24 h-24 mb-2" />
              <p className="text-gray-600">{originalEntry}</p>
            </>
          )
        )}
      </div>
      <div className="flex flex-col items-center mt-4 bg-gray-200 p-4 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-2">Score</h2>
        <p className="text-lg">Generation {generation} Success Rate: {calculateSuccessRate(scores[generation]?.wins || 0, scores[generation]?.losses || 0)}</p>
      </div>
    </div>
  );
}

export default App;
