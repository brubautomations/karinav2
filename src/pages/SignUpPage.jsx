import { SignUp } from '@clerk/clerk-react'

export default function SignUpPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-8">
            <SignUp
                signInUrl="/login"
                fallbackRedirectUrl="/chat"
            />
        </div>
    )
}