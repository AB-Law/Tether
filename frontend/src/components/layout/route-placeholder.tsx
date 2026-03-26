interface RoutePlaceholderProps {
  readonly label: string
}

export function RoutePlaceholder({ label }: RoutePlaceholderProps) {
  return <div>{label} placeholder</div>
}
