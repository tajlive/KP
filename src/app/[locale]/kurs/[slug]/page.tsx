



import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ImmersiveCourse from './ImmersiveCourse'
import { getCoursesData, getCourseBySlug, getCourseDetails } from '@/lib/courses'

interface CoursePageProps {
  params: Promise<{
    locale: string
    slug: string
  }>
}

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const course = getCourseBySlug(locale, slug)
  const details = course ? getCourseDetails(locale, course.id) : null
  
  if (!course || !details) {
    return {
      title: locale === 'no' ? 'Kurs ikke funnet | Klarpakke' : 'Course not found | Klarpakke'
    }
  }

  return {
    title: `${details.title} | Klarpakke ${locale === 'no' ? 'Universitet' : 'University'}`,
    description: details.description,
    openGraph: {
      title: details.title,
      description: details.description,
      type: 'article'
    }
  }
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { locale, slug } = await params
  const course = getCourseBySlug(locale, slug)
  
  if (!course) {
    notFound()
  }

  const details = getCourseDetails(locale, course.id)
  
  if (!details) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <ImmersiveCourse 
        courseId={course.id}
        courseData={details}
      />
    </main>
  )
}

// Static params for kjente kurs
