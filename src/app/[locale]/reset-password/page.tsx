



export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const isNorwegian = locale === 'no';
    return {
        title: isNorwegian ? 'Lag nytt passord | Klarpakke' : 'Reset Password | Klarpakke',
        description: isNorwegian
            ? 'Velg et nytt passord for din konto'
            : 'Choose a new password for your account',
    };
}

import ResetPasswordClient from './ResetPasswordClient';

export default function ResetPasswordPage() {
    return <ResetPasswordClient />;
}
