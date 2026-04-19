export default function QuestionChips({ questions, onChoose }) {
  return (
    <div className="flex flex-wrap gap-2">
      {questions.map((question) => (
        <button
          key={question}
          type="button"
          onClick={() => onChoose(question)}
          className="chip text-left hover:border-command-cyan/30 hover:bg-command-cyan/10"
        >
          {question}
        </button>
      ))}
    </div>
  )
}
