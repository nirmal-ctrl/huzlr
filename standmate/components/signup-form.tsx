'use client'
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Field,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isConnecting, setIsConnecting] = useState(false)

  const handleGoogleLogin = () => {
    setIsConnecting(true)
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google-login`
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo size="lg" href={null} />
          <h1 className="text-xl font-bold">Welcome to huzlr.</h1>
          <FieldDescription>
            Join with your Google account to get started
          </FieldDescription>
        </div>

        <Field className="grid gap-4 w-full pt-4">
          <Button
            variant="outline"
            type="button"
            onClick={handleGoogleLogin}
            disabled={isConnecting}
            className="w-full rounded-full h-11 relative hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all hover:scale-[1.01] cursor-pointer"
          >
            {isConnecting ? (
              <Spinner className="mr-2 h-5 w-5" />
            ) : (
              <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20c11.045 0 20-8.955 20-20 0-1.341-.138-2.65-.389-3.917z" />
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l0 .002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
              </svg>
            )}
            {isConnecting ? "Redirecting..." : "Continue with Google"}
          </Button>
        </Field>
      </FieldGroup>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
