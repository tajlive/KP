'use client'
import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'

interface PanicButtonProps {
  language?: 'no' | 'en'
}

export function PanicButton({ language = 'no' }: PanicButtonProps) {
  const [isClosing, setIsClosing] = useState(false)

  const text = language === 'no' ? {
    button: 'Panikk',
    closing: 'Stenger...',
    message: 'Alle posisjoner stengt!',
  } : {
    button: 'Panic',
    closing: 'Closing...',
    message: 'All positions closed!',
  }

  const handlePanic = async () => {
    setIsClosing(true)
    toast.error(text.message)
    setIsClosing(false)
  }

  return (
    <Button onClick={handlePanic} disabled={isClosing} variant="danger" size="lg" className="gap-2">
      <AlertTriangle className="w-5 h-5" />
      {isClosing ? text.closing : text.button}
    </Button>
  )
}
