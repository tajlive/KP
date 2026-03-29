'use client'

import { useId, useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
}

export function PasswordInput({ label, error, className, id: idProp, ...props }: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false)
    const [isClient, setIsClient] = useState(false)
    const generatedId = useId()
    const id = idProp ?? generatedId

    // CRITICAL FIX: Ensure password is always hidden on mount
    // Defensive against hydration mismatch, autofill, and React StrictMode
    useEffect(() => {
        setIsClient(true)
        setShowPassword(false)
        
        if (process.env.NODE_ENV === 'development') {
             
            console.log('[PasswordInput] Mounted - visibility reset to hidden')
        }
    }, [])

    return (
        <div className="space-y-2">
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}
            <div className="relative">
                <Input
                    id={id}
                    {...props}
                    // CRITICAL: Only show text if client AND user clicked toggle
                    type={isClient && showPassword ? 'text' : 'password'}
                    className={`pr-10 ${className || ''}`}
                />
                <button
                    type="button"
                    onClick={() => {
                        setShowPassword(prev => {
                            const next = !prev
                            if (process.env.NODE_ENV === 'development') {
                                 
                                console.log(`[PasswordInput] Toggle clicked - new state: ${next ? 'visible' : 'hidden'}`)
                            }
                            return next
                        })
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Skjul passord" : "Vis passord"}
                >
                    {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                    ) : (
                        <Eye className="w-5 h-5" />
                    )}
                </button>
            </div>
            {error && (
                <p className="text-sm text-red-600">{error}</p>
            )}
        </div>
    )
}
