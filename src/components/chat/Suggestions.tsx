const SUGGESTIONS = ['帮我看看明天的安排', '下周三下午3点开会', '给目标排期一周', '本周小结']

interface Props {
  onPick: (text: string) => void
}

/** 空态快捷问句 */
export default function Suggestions({ onPick }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {SUGGESTIONS.map(s => (
        <button key={s} onClick={() => onPick(s)}
          className="btn justify-center text-center text-xs leading-snug">
          {s}
        </button>
      ))}
    </div>
  )
}
