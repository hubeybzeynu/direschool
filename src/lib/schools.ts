export type School = {
  id: string;
  name: string;
};

function slugify(s: string, idx: number) {
  const base = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base ? `${base}-${idx}` : `school-${idx}`;
}

const NAMES: string[] = [
  "ድ/ደ/አጠ/ 2ኛ ደረጃና መሰነዶ ት/ቤት",
  "ሳቢያን 2ኛ ደረጃና መሰነዶ ት/ቤት",
  "ከዚራ 1ኛ ደረጃ ት/ቤት",
  "ም/ጀግኖች 1ኛ ደረጃ ት/ቤት",
  "ማሪያም ሰፈር 1ኛና 2ኛ ደረጃ ት/ቤት",
  "ም/እናት 1ኛ ደረጃ ት/ቤት",
  "ለገሀሬ 1ኛና 2ኛ ደረጃ ት/ቤ",
  "ሳቢያን ቁ.2 1ኛ ደረጃ ት/ቤት",
  "የነገ ተስፋ 1ኛ ደረጃ ት/ቤት",
  "መ/ዓለም 1ኛና 2ኛ ደረጃ ት/ቤ",
  "አፈተኢሳ 1ኛና 2ኛ ደረጃ ት/ቤት",
  "አባዮሀንስ 1ኛ ደረጃ ት/ቤት",
  "ማረሚያ 1ኛ ደረጃ ት/ቤት",
  "ህዳሴ 1ኛ ደረጃ ት/ቤት",
  "ሀ/መ/አ/አ/ኦክሰዴ 1ኛ ደረጃ ት/ቤት",
  "ገንደ ገራዳ 1ኛ ደረጃ ት/ቤት",
  "ጉጉባ 1ኛ ደረጃ ት/ቤት",
  "ሀዊ ቦሩ 1ኛ ደረጃ ት/ቤት",
  "መልካ ጀብዱ 1ኛ እና 2ኛ ደረጃ ት/ቤት",
  "መልካ ጀብዱ ቁ-2 1ኛ ደረጃ ት/ቤት",
  "Jan School",
  "አዲሱ 2ኛ ደረጃና መሰነዶ ት/ቤት",
  "ሀርላ 1ኛ ደረጃ ት/ቤት",
  "ገንደሪጌ ቁጥር 2 1ኛ ደረጃ ት/ቤት",
  "ሁላሁሉል 1ኛ ደረጃ ት/ቤት",
  "ሀሎ ቡሳ 1ኛ ደረጃ ት/ቤት",
  "Dire Dawa University STEM Center",
  "ዋሄል 1ኛና 2ኛ ደረጃ ት/ቤት",
  "ሁሉል ሞጆ 1ኛ ደረጃ ት/ቤት",
  "American Corner",
  "ቢዮ አዋሌ 1ኛ ደረጃ ት/ቤት",
  "Dire Elit School",
  "Saba Kidus Gebreal School",
  "Abune Gorogoriyos School",
  "Dire Betel No. 2 School",
  "Kidist Theresa School",
  "Bisrate Gebreal School",
  "Meahdelnur School",
  "Alfelah School",
  "Darul ulum School",
  "አሰሊሶ 1ኛ ደረጃ ት/ቤት",
  "ጀልዴሳ 1ኛና 2ኛ ደረጃ ት/ቤት",
  "LG Betenatan School",
  "አያሌ ቁጥር 2 1ኛ ደረጃ ት/ቤት",
  "Notredam School",
  "መልካ ቀሮ 1ኛ ደረጃ ት/ቤት",
  "Adis Hiwot School",
  "አገምሣ 1ኛ ደረጃ ት/ቤት",
  "ገንደ ሮቁ 1ኛ ደረጃ ት/ቤት",
];

export const SCHOOLS: School[] = NAMES.map((name, i) => ({
  id: slugify(name, i + 1),
  name,
}));

export function getSchoolById(id: string): School | undefined {
  return SCHOOLS.find((s) => s.id === id);
}