



import GlemtPassordClient from './GlemtPassordClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const isNorwegian = locale === 'no';
    return {
        title: isNorwegian ? 'Glemt passord | Klarpakke' : 'Forgot Password | Klarpakke',
        description: isNorwegian
            ? 'Gjenopprett tilgangen til din konto'
            : 'Reset your account password',
    };
}

export default function GlemtPassordPage() {
    return <GlemtPassordClient />;
}
