import Link from 'next/link'

export default function AuthCodeError() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-gray-50 p-4 dark:bg-gray-900">
            <div className="flex max-w-[400px] flex-col items-center gap-2 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="h-8 w-8 text-red-600 dark:text-red-500"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                        />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Authentication Error
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                    We couldn't verify your login. The link may have expired or is invalid.
                    Please try signing in again.
                </p>
            </div>
            <Link
                href="/"
                className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
            >
                Return Home
            </Link>
        </div>
    )
}
