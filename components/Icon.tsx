import * as RemixIcons from '@remixicon/react'
import { ComponentType } from 'react'

interface IconProps {
  name: keyof typeof RemixIcons
  size?: number | string
  color?: string
  className?: string
}

const Icon = ({ name, size = 24, color, className }: IconProps) => {
  const IconComponent = RemixIcons[name] as ComponentType<{
    size?: number | string
    color?: string
    className?: string
  }>

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in RemixIcons`)
    return null
  }

  return <IconComponent size={size} color={color} className={className} />
}

export default Icon
