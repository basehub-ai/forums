import { headers } from "next/headers"
import Link from "next/link"
import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { Button } from "./button"
import { Container } from "./container"
import { MobileNav } from "./mobile-nav"
import { SignInButton } from "./sign-in-button"
import { UserDropdown } from "./user-dropdown"

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-linear-to-b from-50% from-background via-70% via-[rgba(var(--background-raw),0.70)] to-[rgba(var(--background-raw),0.00)] md:from-30% md:via-60%">
      <Container className="flex min-h-header flex-row items-center justify-between gap-x-5">
        {/* left side */}
        <div className="flex items-center gap-x-2 pt-4 pb-4">
          <Link className="group flex items-center gap-x-1 pr-1" href="/">
            <svg
              fill="none"
              height="22"
              viewBox="0 0 22 22"
              width="22"
              xmlns="http://www.w3.org/2000/svg"
            >
              <title>Forums Logo</title>
              <path
                d="M2.74303 14.98C2.87782 15.3201 2.90783 15.6926 2.8292 16.0498L1.85295 19.0656C1.8215 19.2186 1.82963 19.377 1.87658 19.5259C1.92353 19.6749 2.00774 19.8093 2.12123 19.9166C2.23472 20.0238 2.37372 20.1003 2.52505 20.1387C2.67638 20.1772 2.83503 20.1764 2.98595 20.1363L6.11454 19.2215C6.45161 19.1546 6.80069 19.1838 7.12195 19.3058C9.07939 20.2199 11.2968 20.4133 13.3829 19.8519C15.4691 19.2904 17.2899 18.0102 18.5241 16.2371C19.7583 14.464 20.3267 12.312 20.1288 10.1607C19.931 8.00943 18.9797 5.99714 17.4428 4.47889C15.9059 2.96064 13.8821 2.034 11.7286 1.86245C9.57501 1.69091 7.43008 2.28548 5.67219 3.54128C3.91431 4.79707 2.65644 6.63338 2.12052 8.72622C1.5846 10.8191 1.80507 13.0339 2.74303 14.98Z"
                stroke="#FF6C02"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.125"
              />
              <mask
                height="20"
                id="mask0_10775_8616"
                maskUnits="userSpaceOnUse"
                style={{ maskType: "alpha" }}
                width="20"
                x="1"
                y="1"
              >
                <path
                  d="M2.74303 14.98C2.87782 15.3201 2.90783 15.6926 2.8292 16.0498L1.85295 19.0656C1.8215 19.2186 1.82963 19.377 1.87658 19.5259C1.92353 19.6749 2.00774 19.8093 2.12123 19.9166C2.23472 20.0238 2.37372 20.1003 2.52505 20.1387C2.67638 20.1772 2.83503 20.1764 2.98595 20.1363L6.11454 19.2215C6.45161 19.1546 6.80069 19.1838 7.12195 19.3058C9.07939 20.2199 11.2968 20.4133 13.3829 19.8519C15.4691 19.2904 17.2899 18.0102 18.5241 16.2371C19.7583 14.464 20.3267 12.312 20.1288 10.1607C19.931 8.00943 18.9797 5.99714 17.4428 4.47889C15.9059 2.96064 13.8821 2.034 11.7286 1.86245C9.57501 1.69091 7.43008 2.28548 5.67219 3.54128C3.91431 4.79707 2.65644 6.63338 2.12052 8.72622C1.5846 10.8191 1.80507 13.0339 2.74303 14.98Z"
                  fill="#FAFAFA"
                  stroke="#FF6C02"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.125"
                />
              </mask>
              <g mask="url(#mask0_10775_8616)">
                <rect
                  fill="#FF6C02"
                  height="1.76015"
                  opacity="0.6"
                  transform="matrix(0.707108 -0.707105 0.707108 0.707105 5.0957 28.3929)"
                  width="33.0909"
                />
                <rect
                  fill="#FF6C02"
                  height="1.76015"
                  opacity="0.5"
                  transform="matrix(0.707108 -0.707105 0.707108 0.707105 5.0957 25.9293)"
                  width="33.0909"
                />
                <rect
                  fill="#FF6C02"
                  height="1.76015"
                  opacity="0.4"
                  transform="matrix(0.707108 -0.707105 0.707108 0.707105 2.63086 25.9293)"
                  width="33.0909"
                />
                <rect
                  fill="#FF6C02"
                  height="1.76015"
                  opacity="0.3"
                  transform="matrix(0.707108 -0.707105 0.707108 0.707105 0.166016 25.9293)"
                  width="33.0909"
                />
                <rect
                  fill="#FF6C02"
                  height="1.76015"
                  opacity="0.25"
                  transform="matrix(0.707108 -0.707105 0.707108 0.707105 -0.537109 24.1686)"
                  width="33.0909"
                />
                <rect
                  fill="#FF6C02"
                  height="1.76015"
                  opacity="0.2"
                  transform="matrix(0.707108 -0.707105 0.707108 0.707105 -0.888672 22.0568)"
                  width="33.0909"
                />
                <rect
                  fill="#FF6C02"
                  height="1.76015"
                  opacity="0.15"
                  transform="matrix(0.707108 -0.707105 0.707108 0.707105 -1.94531 20.6488)"
                  width="33.0909"
                />
                <rect
                  fill="#FF6C02"
                  height="1.76015"
                  opacity="0.1"
                  transform="matrix(0.707108 -0.707105 0.707108 0.707105 -4.41016 20.6488)"
                  width="33.0909"
                />
                <rect
                  fill="#FF6C02"
                  height="1.76015"
                  opacity="0.05"
                  transform="matrix(0.707108 -0.707105 0.707108 0.707105 -6.875 20.6488)"
                  width="33.0909"
                />
              </g>
            </svg>
            <span className="whitespace-nowrap font-semibold grou-hover:text-bright text-dim uppercase group-hover:underline">
              Forums
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-x-5">
          <nav className="hidden items-center gap-x-5 md:flex">
            <Link
              className="font-medium text-faint text-sm hover:text-muted hover:underline"
              href="http://x.com/basehub_ai"
              target="_blank"
            >
              About Us
            </Link>
            <Link
              className="font-medium text-faint text-sm hover:text-muted hover:underline"
              href="/basehub-ai/forums"
              target="_blank"
            >
              Help
            </Link>
            <Link
              className="font-medium text-faint text-sm hover:text-muted hover:underline"
              href="https://github.com/basehub-ai/forums"
              target="_blank"
            >
              GitHub
            </Link>
          </nav>
          <MobileNav />
          <Suspense
            fallback={
              <Button disabled size="sm" type="button" variant="secondary">
                Loading
              </Button>
            }
          >
            <User />
          </Suspense>
        </div>
      </Container>
    </header>
  )
}

const User = async () => {
  const data = await auth.api.getSession({ headers: await headers() })

  if (!data) {
    return <SignInButton />
  }

  return <UserDropdown {...data} />
}
