import enCourses from "../data/courses/en.json";
import noCourses from "../data/courses/no.json";
import thCourses from "../data/courses/th.json";
import zhCourses from "../data/courses/zh.json";

export type Course = (typeof noCourses.courses)[0];
export type CourseDetails =
  | (typeof noCourses.courseDetails)["krypto-for-smaasparere"]
  | (typeof noCourses.courseDetails)["trading-masterclass"]
  | (typeof noCourses.courseDetails)["defi-explorer"];

export type Lesson = {
  id: number;
  title: string;
  description: string;
  audioUrl?: string;
  buttons?: {
    start: string;
    pause: string;
    mute: string;
    unmute: string;
  };
};
export type CoursesData = typeof noCourses;

const coursesData: Record<string, CoursesData> = {
  no: noCourses,
  en: enCourses,
  th: thCourses as any as CoursesData,
  zh: zhCourses as any as CoursesData,
};

export function getCoursesData(locale: string): CoursesData {
  return coursesData[locale] || coursesData["no"];
}

export function getCourseBySlug(
  locale: string,
  slug: string,
): Course | undefined {
  // Prøv først vanlig oppslag
  const data = getCoursesData(locale);
  const course = data.courses.find((c) => c.slug === slug);

  if (course) return course;

  // Hvis ikke funnet, sjekk alle språk for å finne riktig ID
  const allLocales = ["no", "en", "th", "zh"];
  let courseId: string | undefined;

  for (const l of allLocales) {
    const d = getCoursesData(l);
    const found = d.courses.find((c) => c.slug === slug);
    if (found) {
      courseId = found.id;
      break;
    }
  }

  // Hvis vi fant ID'en i et annet språk, returner kurset pa riktig språk
  if (courseId) {
    return data.courses.find((c) => c.id === courseId);
  }

  return undefined;
}

export function getCourseDetails(
  locale: string,
  courseId: string,
): CourseDetails | undefined {
  const data = getCoursesData(locale);
  return data.courseDetails[courseId as keyof typeof data.courseDetails];
}
