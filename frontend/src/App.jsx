import { useState } from 'react'
import './App.css'

function App() {
  const [topic, setTopic] = useState('')
  const [questions, setQuestions] = useState([])

  const generateQuestions = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic })
      })
      const data = await response.json()
      setQuestions(data.questions)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return (
    <div className="app">
      <h1>Gerador de Perguntas com IA</h1>
      <div className="input-group">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Digite um tema"
        />
        <button onClick={generateQuestions}>Gerar Perguntas</button>
      </div>
      
      <div className="questions-list">
        {questions.map((q, i) => (
          <div key={i} className="question">{q}</div>
        ))}
      </div>
    </div>
  )
}

export default App