import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs"

export const Header = () => {
  return (
    <header className="flex h-16 items-center justify-end gap-4 p-4">
      <SignedOut>
        <SignInButton />
        <SignUpButton>
          <button
            className="h-10 cursor-pointer rounded-full bg-[#6c47ff] px-4 font-medium text-ceramic-white text-sm sm:h-12 sm:px-5 sm:text-base"
            type="button"
          >
            Sign Up
          </button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </header>
  )
}
