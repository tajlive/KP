'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, X, Download, Search, Filter, GraduationCap } from 'lucide-react'

interface Student {
  student_nummer: number
  erfaring: string
  laeringsmaal: string[]
  email: string
  handle: string | null
  tokens_credited: boolean
  created_at: string
}

interface StudentTableProps {
  students: Student[]
}

export function StudentTable({ students }: StudentTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [erfaringFilter, setErfaringFilter] = useState<'all' | 'nybegynner' | 'litt' | 'viderekommen' | 'erfaren'>('all')
  const [tokensFilter, setTokensFilter] = useState<'all' | 'uncredited'>('all')

  // Filtrer studenter
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // Søk på email
      const matchesSearch = student.email.toLowerCase().includes(searchQuery.toLowerCase())
      
      // Filter på erfaring
      const matchesErfaring = erfaringFilter === 'all' || student.erfaring === erfaringFilter
      
      // Filter på tokens
      const matchesTokens = tokensFilter === 'all' || 
        (tokensFilter === 'uncredited' && !student.tokens_credited)
      
      return matchesSearch && matchesErfaring && matchesTokens
    })
  }, [students, searchQuery, erfaringFilter, tokensFilter])

  // Eksporter til CSV
  const exportToCSV = () => {
    const headers = ['Student #', 'E-post', 'Erfaring', 'Læringsmål', 'Handle', 'Tokens kreditert', 'Registrert']
    
    const rows = filteredStudents.map((s) => [
      s.student_nummer,
      s.email,
      s.erfaring,
      (s.laeringsmaal || []).join(', '),
      s.handle || '',
      s.tokens_credited ? 'Ja' : 'Nei',
      new Date(s.created_at).toLocaleString('no-NO')
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `klarpakke-students-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // Formater dato
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('no-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Formater erfaring for visning
  const formatErfaring = (erfaring: string) => {
    const map: Record<string, string> = {
      nybegynner: 'Nybegynner',
      litt: 'Litt erfaring',
      viderekommen: 'Viderekommen',
      erfaren: 'Erfaren'
    }
    return map[erfaring] || erfaring
  }

  return (
    <Card className="border-slate-700 bg-slate-800/50">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-500" />
            Studentoversikt
          </CardTitle>
          
          <Button
            onClick={exportToCSV}
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 hover:bg-slate-700 w-full sm:w-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            Eksporter CSV
          </Button>
        </div>

        {/* Filter-seksjon */}
        <div className="mt-4 space-y-3">
          {/* Søk */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              type="text"
              placeholder="Søk på e-post..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          {/* Filter-rad */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Filter className="w-4 h-4" />
              <span>Filter:</span>
            </div>
            
            <select
              value={erfaringFilter}
              onChange={(e) => setErfaringFilter(e.target.value as typeof erfaringFilter)}
              className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5"
            >
              <option value="all">Alle erfaringer</option>
              <option value="nybegynner">Nybegynner</option>
              <option value="litt">Litt erfaring</option>
              <option value="viderekommen">Viderekommen</option>
              <option value="erfaren">Erfaren</option>
            </select>

            <select
              value={tokensFilter}
              onChange={(e) => setTokensFilter(e.target.value as typeof tokensFilter)}
              className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5"
            >
              <option value="all">Alle tokens</option>
              <option value="uncredited">Mangler tokens</option>
            </select>

            {(searchQuery || erfaringFilter !== 'all' || tokensFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setErfaringFilter('all')
                  setTokensFilter('all')
                }}
                className="text-slate-400 hover:text-white"
              >
                Nullstill
              </Button>
            )}
          </div>

          {/* Resultat-teller */}
          <p className="text-sm text-slate-500">
            Viser {filteredStudents.length} av {students.length} studenter
          </p>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/50 border-b border-slate-700">
              <tr>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">#</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">E-post</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Erfaring</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Læringsmål</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Handle</th>
                <th className="text-center py-3 px-4 text-slate-400 font-medium">Tokens</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Registrert</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredStudents.map((student) => (
                <tr key={student.student_nummer} className="hover:bg-slate-700/30">
                  <td className="py-3 px-4 text-white font-medium">
                    #{student.student_nummer}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {student.email}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      student.erfaring === 'nybegynner' 
                        ? 'bg-green-500/10 text-green-400'
                        : student.erfaring === 'erfaren'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {formatErfaring(student.erfaring)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                    {(student.laeringsmaal || []).join(', ')}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {student.handle || '-'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {student.tokens_credited ? (
                      <Check className="w-5 h-5 text-green-500 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-red-500 mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {formatDate(student.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            Ingen studenter funnet med valgte filtre
          </div>
        )}
      </CardContent>
    </Card>
  )
}
