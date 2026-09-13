"use client";

import { useQuery } from "@tanstack/react-query";
import { StatusMessage } from "@/components/StatusMessage";
import api from "@/lib/api/client";
import { formatMoney, formatNullableNumber } from "@/lib/format";
import type { CourseListResponse } from "@/lib/types/api";

async function fetchCourses(): Promise<CourseListResponse> {
  const { data } = await api.get<CourseListResponse>("/courses");
  return data;
}

export default function CoursesPage() {
  const query = useQuery({
    queryKey: ["courses"],
    queryFn: fetchCourses,
    refetchInterval: (currentQuery) => {
      const data = currentQuery.state.data as CourseListResponse | undefined;
      return data ? data.previewExpiresInSeconds * 1000 : false;
    },
    refetchIntervalInBackground: false,
  });

  const courses = query.data?.courses ?? [];

  if (query.isLoading) {
    return <StatusMessage state="loading" />;
  }

  if (query.isError) {
    return (
      <StatusMessage
        state="error"
        message={
          query.error instanceof Error
            ? query.error.message
            : "Unable to load courses right now."
        }
      />
    );
  }

  if (!courses.length) {
    return <StatusMessage state="empty" message="No published courses are available right now." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-slate-900">Courses</h2>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-4">
        {courses.map((course) => (
          <article
            key={course.id}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{course.title}</h3>
                <p className="mt-1 text-sm text-slate-600">by {course.instructorName}</p>
              </div>
              <p className="text-lg font-semibold text-slate-900">
                {formatMoney(course.priceMinor, course.currency)}
              </p>
            </div>

            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md bg-slate-50 p-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Enrolments</dt>
                <dd className="mt-1 text-base font-medium text-slate-900">
                  {formatNullableNumber(course.enrolmentCount)}
                </dd>
              </div>

              <div className="rounded-md bg-slate-50 p-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Rating</dt>
                <dd className="mt-1 text-base font-medium text-slate-900">
                  {course.averageRating === null ? "—" : course.averageRating.toFixed(1)}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
