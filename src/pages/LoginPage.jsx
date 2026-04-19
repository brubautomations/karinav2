import { SignIn } from '@clerk/clerk-react'

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-8">
            <SignIn
                signUpUrl="/signup"
                fallbackRedirectUrl="/chat"
            />
        </div>
    )
}