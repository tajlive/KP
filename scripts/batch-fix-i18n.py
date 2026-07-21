#!/usr/bin/env python3
"""
i18n Batch Fix — auto-genererer manglende nøkler i no.json + en.json
Basert på output fra validate-i18n-usage.js

Usage: python3 scripts/batch-fix-i18n.py [--dry-run]
"""
import json, re, os, sys
from copy import deepcopy

SRC = 'src'
NO_FILE = 'messages/no.json'
EN_FILE = 'messages/en.json'

def load_json(path):
    with open(path) as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')

def ensure_path(data, parts):
    """Create nested path in dict, return the leaf"""
    cur = data
    for p in parts[:-1]:
        if p not in cur or not isinstance(cur[p], dict):
            cur[p] = {}
        cur = cur[p]
    return cur, parts[-1]

def camel_to_norsk(key):
    """Generate Norwegian placeholder from camelCase key"""
    # Common patterns
    mapping = {
        'title': 'Tittel',
        'subtitle': 'Undertittel',
        'description': 'Beskrivelse',
        'label': 'Etikett',
        'placeholder': 'Plassholder',
        'hint': 'Tips',
        'error': 'Feil',
        'empty': 'Ingen data',
        'loading': 'Laster',
        'success': 'Suksess',
        'active': 'Aktiv',
        'inactive': 'Inaktiv',
        'paused': 'Pauset',
        'stopped': 'Stoppet',
        'start': 'Start',
        'stop': 'Stopp',
        'pause': 'Pause',
        'resume': 'Gjenoppta',
        'back': 'Tilbake',
        'close': 'Lukk',
        'save': 'Lagre',
        'cancel': 'Avbryt',
        'confirm': 'Bekreft',
        'delete': 'Slett',
        'edit': 'Rediger',
        'create': 'Opprett',
        'add': 'Legg til',
        'remove': 'Fjern',
        'search': 'Søk',
        'filter': 'Filter',
        'sort': 'Sorter',
        'view': 'Vis',
        'show': 'Vis',
        'hide': 'Skjul',
        'more': 'Mer',
        'less': 'Mindre',
        'all': 'Alle',
        'none': 'Ingen',
        'buy': 'Kjøp',
        'sell': 'Selg',
        'trade': 'Handel',
        'trades': 'Handler',
        'price': 'Pris',
        'total': 'Totalt',
        'value': 'Verdi',
        'amount': 'Beløp',
        'size': 'Størrelse',
        'quantity': 'Antall',
        'pnl': 'P/L',
        'profit': 'Profitt',
        'loss': 'Tap',
        'win': 'Vinn',
        'winRate': 'Andel vinnere',
        'winrate': 'Andel vinnere',
        'bestDay': 'Beste dag',
        'worstDay': 'Verste dag',
        'avgTrade': 'Gj.snitt handel',
        'maxDrawdown': 'Maks drawdown',
        'overview': 'Oversikt',
        'summary': 'Sammendrag',
        'stats': 'Statistikk',
        'statistics': 'Statistikk',
        'performance': 'Resultat',
        'history': 'Historikk',
        'settings': 'Innstillinger',
        'preferences': 'Preferanser',
        'profile': 'Profil',
        'account': 'Konto',
        'password': 'Passord',
        'email': 'E-post',
        'name': 'Navn',
        'time': 'Tid',
        'date': 'Dato',
        'status': 'Status',
        'mode': 'Modus',
        'type': 'Type',
        'source': 'Kilde',
        'role': 'Rolle',
        'level': 'Nivå',
        'tier': 'Nivå',
        'plan': 'Plan',
        'course': 'Kurs',
        'lesson': 'Leksjon',
        'module': 'Modul',
        'chapter': 'Kapittel',
        'badge': 'Utmerkelse',
        'progress': 'Fremdrift',
        'complete': 'Fullfør',
        'completed': 'Fullført',
        'finish': 'Fullfør',
        'continue': 'Fortsett',
        'review': 'Se gjennom',
        'startCourse': 'Start kurs',
        'continueCourse': 'Fortsett kurs',
        'required': 'Påkrevd',
        'optional': 'Valgfri',
        'beginner': 'Nybegynner',
        'intermediate': 'Videregående',
        'advanced': 'Avansert',
        'minutes': 'minutter',
        'lessons': 'leksjoner',
        'of': 'av',
        'unknown': 'Ukjent',
        'paper': 'Papir',
        'live': 'Live',
        'demo': 'Demo',
        'manual': 'Manuell',
        'automatic': 'Automatisk',
        'auto': 'Auto',
        'strategy': 'Strategi',
        'signal': 'Signal',
        'session': 'Økt',
        'sessions': 'Økter',
        'portfolio': 'Portefølje',
        'market': 'Marked',
        'pair': 'Par',
        'symbol': 'Symbol',
        'currency': 'Valuta',
        'dollar': 'Dollar',
        'nok': 'NOK',
        'cash': 'Kontanter',
        'balance': 'Balanse',
        'capital': 'Kapital',
        'risk': 'Risiko',
        'low': 'Lav',
        'medium': 'Middels',
        'high': 'Høy',
        'balanced': 'Balansert',
        'conservative': 'Konservativ',
        'aggressive': 'Aggressiv',
        'confirmStop': 'Bekreft stopp',
        'confirmDelete': 'Bekreft sletting',
        'areYouSure': 'Er du sikker?',
        'noData': 'Ingen data',
        'notAvailable': 'Ikke tilgjengelig',
        'comingSoon': 'Kommer snart',
        'learnMore': 'Lær mer',
        'readMore': 'Les mer',
        'seeAll': 'Se alle',
        'showMore': 'Vis mer',
        'tryAgain': 'Prøv igjen',
        'refresh': 'Oppdater',
        'loading': 'Laster...',
        'networkError': 'Nettverksfeil',
        'unknownError': 'Ukjent feil',
        'somethingWentWrong': 'Noe gikk galt',
        'pageNotFound': 'Siden finnes ikke',
        'backToHome': 'Tilbake til forsiden',
        'backToDashboard': 'Tilbake til dashboard',
        'goToDashboard': 'Gå til dashboard',
        'noTrades': 'Ingen handler',
        'noSessions': 'Ingen økter',
        'noResults': 'Ingen resultater',
        'noDataYet': 'Ingen data enda',
        'waitingForData': 'Venter på data...',
        'lastUpdated': 'Sist oppdatert',
        'updated': 'Oppdatert',
        'today': 'I dag',
        'yesterday': 'I går',
        'thisWeek': 'Denne uken',
        'thisMonth': 'Denne måneden',
        'totalTrades': 'Totalt antall handler',
        'totalPnL': 'Total P/L',
        'realizedPnL': 'Realisert P/L',
        'unrealizedPnL': 'Urealisert P/L',
        'dailyPnL': 'Daglig P/L',
        'weeklyPnL': 'Ukesresultat',
        'monthlyPnL': 'Månedsresultat',
    }
    
    # Direct match
    if key in mapping:
        return mapping[key]
    
    # Try compound match (e.g., "confirmStopBot" → "Bekreft stopp bot")
    # Split by capitals
    parts = re.findall(r'[A-Z]?[a-z]+|[A-Z]+(?=[A-Z]|$)', key)
    if parts:
        translated = []
        for p in parts:
            lp = p.lower()
            translated.append(mapping.get(lp, p))
        # Handle specific multi-word patterns
        result = ' '.join(translated)
        return result.capitalize()
    
    return key

def camel_to_english(key):
    """Generate English placeholder from camelCase key"""
    # Split by capitals
    parts = re.findall(r'[A-Z]?[a-z]+|[A-Z]+(?=[A-Z]|$)', key)
    if parts:
        return ' '.join(p.capitalize() for p in parts)
    return key

def find_missing_in_source():
    """Scan source files for missing t() calls — same logic as validate-i18n-usage.js"""
    messages = load_json(NO_FILE)
    
    def key_exists(data, full_key):
        parts = full_key.split('.')
        cur = data
        for p in parts:
            if isinstance(cur, dict) and p in cur:
                cur = cur[p]
            else:
                return False
        return True
    
    missing = {}  # full_key → [(file, line)]
    seen = set()
    
    for root, dirs, files in os.walk(SRC):
        if 'node_modules' in root or '__tests__' in root:
            continue
        for fname in files:
            if not fname.endswith(('.tsx', '.ts')):
                continue
            fpath = os.path.join(root, fname)
            try:
                with open(fpath, errors='ignore') as f:
                    content = f.read()
            except:
                continue
            
            lines = content.split('\n')
            ns = None
            for i, line in enumerate(lines):
                m = re.search(r'useTranslations\s*\(\s*["\']([^"\']+)["\']\s*\)', line)
                if m:
                    ns = m.group(1)
                
                # Match t("key") — skip false positives
                for m in re.finditer(r'(?<![.\w])t\s*\(\s*["\']([a-zA-Z][^"\',)]+)["\']\s*\)', line):
                    key = m.group(1)
                    if not key or '\n' in key or ',' in key or '${' in key:
                        continue
                    if ns:
                        full = f'{ns}.{key}'
                        if full not in seen:
                            seen.add(full)
                            if not key_exists(messages, full):
                                if full not in missing:
                                    missing[full] = []
                                missing[full].append((fpath, i+1))
    
    return missing

def main():
    dry_run = '--dry-run' in sys.argv
    
    print(f"{'🔍 DRY RUN' if dry_run else '🔧 BATCH FIX'} — i18n auto-generator\n")
    
    messages_no = load_json(NO_FILE)
    messages_en = load_json(EN_FILE)
    
    missing = find_missing_in_source()
    print(f"Fant {len(missing)} manglende nøkler\n")
    
    # Group by namespace
    by_ns = {}
    for full in missing:
        ns = full.split('.')[0]
        if ns not in by_ns:
            by_ns[ns] = []
        by_ns[ns].append(full)
    
    added = 0
    for ns in sorted(by_ns.keys()):
        keys = by_ns[ns]
        print(f"\n  [{ns}] — {len(keys)} keys")
        
        for full in keys:
            parts = full.split('.')
            key_name = parts[-1]
            
            # Ensure path exists in no.json
            leaf_no, last = ensure_path(messages_no, parts)
            if last not in leaf_no:
                value = camel_to_norsk(key_name)
                leaf_no[last] = value
                added += 1
            
            # Ensure path exists in en.json (copy structure if needed)
            leaf_en, last_en = ensure_path(messages_en, parts)
            if last_en not in leaf_en:
                value = camel_to_english(key_name)
                leaf_en[last_en] = value
    
    print(f"\n\n📊  Lagt til: {added} nøkler i no.json + tilsvarende i en.json")
    
    if added > 0:
        print(f"   no.json: {count_keys(messages_no)} keys")
        print(f"   en.json: {count_keys(messages_en)} keys")
    
    if dry_run:
        print("\n✅ Dry-run complete — ingen filer endret")
    else:
        save_json(NO_FILE, messages_no)
        save_json(EN_FILE, messages_en)
        print(f"\n✅ Lagret: {NO_FILE} og {EN_FILE}")
    
    return added

def count_keys(data, prefix=''):
    count = 0
    for k, v in data.items():
        path = f'{prefix}.{k}' if prefix else k
        count += 1
        if isinstance(v, dict):
            count += count_keys(v, path)
    return count

if __name__ == '__main__':
    main()
