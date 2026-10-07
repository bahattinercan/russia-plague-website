/**
 * Çeviri regresyon testleri (ağa çıkmaz).
 *
 * Çalıştır:  npm run translation-check
 *
 * Editoryal kuralı ve çeviri kapılarını korur:
 *   - "doğrulandı/teyit edildi" çıktıda geçemez
 *   - belirsizlik (suspected) çeviride kaybolamaz
 *   - sayı ve özel ad korunur
 *
 * Yeni bir sağlayıcı/istek yolu eklendiğinde buraya test eklenmelidir.
 */
import { validateTranslation } from '@/lib/translate/validate';
import { detectSourceLang, shouldTranslate } from '@/lib/translate/detect';
import { glossaryInstructions } from '@/lib/translate/glossary';
import { parseGoogleResponse } from '@/lib/translate/google';
import { parseTranslations } from '@/lib/translate/openai';

let failures = 0;

function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

console.log('\n── validate: yasaklı kelime ─────────────────────────────────────');
check(
  'doğrulandı REDDEDİLİR',
  !validateTranslation('Russia reports plague case', 'Rusya veba vakasını doğruladı', 'en').ok,
);
check(
  'teyit edildi REDDEDİLİR',
  !validateTranslation('Russia reports plague case', 'Rusya veba vakasını teyit etti', 'en').ok,
);
check(
  '"confirmed" REDDEDİLİR',
  !validateTranslation('Russia reports plague case', 'Rusya veba vakası confirmed', 'en').ok,
);

console.log('\n── validate: belirsizlik (hedging) korunumu ─────────────────────');
check(
  'suspected → şüpheli GEÇER',
  validateTranslation('Suspected plague case in Russia', "Rusya'da şüpheli veba vakası", 'en').ok,
);
check(
  'suspected düşerse REDDEDİLİR',
  !validateTranslation('Suspected plague case in Russia', "Rusya'da veba vakası", 'en').ok,
);
check(
  'kaynak kesinken "kesin" eklenirse REDDEDİLİR',
  !validateTranslation("Plague case in Russia", "Rusya'da veba vakası kesinleşti", 'en').ok,
);

console.log('\n── validate: sayı ve özel ad ────────────────────────────────────');
check(
  'sayı kaybolursa REDDEDİLİR',
  !validateTranslation('3 people died of plague in Irkutsk in 2026', "Irkutsk'ta kişi öldü", 'en').ok,
);
check(
  'WHO korunmazsa REDDEDİLİR',
  !validateTranslation('WHO monitors plague in Russia', "Dünya Sağlık Örgütü Rusya'da vebayı izliyor", 'en').ok,
);
check(
  'WHO korunursa GEÇER',
  validateTranslation('WHO monitors plague in Russia', "WHO Rusya'da vebayı izliyor", 'en').ok,
);

console.log('\n── validate: no-op / boş / Kiril sızıntısı ──────────────────────');
check('boş çıktı REDDEDİLİR', !validateTranslation('Plague in Russia', '', 'en').ok);
check(
  'çevrilmemiş metin REDDEDİLİR',
  !validateTranslation('Plague in Russia', 'Plague in Russia', 'en').ok,
);
check(
  'EN kaynakta Kiril REDDEDİLİR',
  !validateTranslation('Plague in Russia', 'Чума в России', 'en').ok,
);

console.log('\n── detect: kaynak dil ───────────────────────────────────────────');
check('Kiril → ru', detectSourceLang('Чума в России') === 'ru');
check('Türkçe diakritik → tr', detectSourceLang('Veba salgını') === 'tr');
check('İngilizce → en', detectSourceLang('Plague in Russia') === 'en');
check('lang=en çevrilir', shouldTranslate('en', 'Plague') === true);
check('lang=tr çevrilmez', shouldTranslate('tr', 'Veba') === false);

console.log('\n── glossary ─────────────────────────────────────────────────────');
const gi = glossaryInstructions('Suspected plague case in Irkutsk monitored by WHO');
check('plague → veba sözlükte', gi.includes('"plague" → "veba"'));
check('WHO korunur olarak işaretlenir', gi.includes('"WHO" aynen korunur'));

console.log('\n── sağlayıcı ayrıştırıcıları ────────────────────────────────────');
check(
  'google yanıtı çözülür',
  parseGoogleResponse([[['Rusya veba vakası', 'Russia plague case', null, null, 10]], null, 'en']) ===
    'Rusya veba vakası',
);
check('google bozuk yanıt → null', parseGoogleResponse({}) === null);
check(
  'openai JSON çözülür',
  parseTranslations('{"translations":["Veba vakası","Şüpheli vaka"]}', 2)[0] === 'Veba vakası',
);
check(
  'openai kod bloğu tolere edilir',
  parseTranslations('```json\n{"translations":["Veba"]}\n```', 1)[0] === 'Veba',
);
check(
  'openai eksik öğe → null',
  parseTranslations('{"translations":[]}', 1)[0] === null,
);

console.log(
  failures === 0
    ? '\n✔ Tüm çeviri testleri geçti.\n'
    : `\n✖ ${failures} test başarısız.\n`,
);
if (failures > 0) process.exit(1);
