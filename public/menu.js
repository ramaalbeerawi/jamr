/* قائمة «جمر»: ملف واحد بيقرأه المتصفح والسيرفر، عشان الأسعار تكون من مصدر واحد. */
(function (root) {
  // المكونات: الاسم، وترتيب الطبقة على الخبزة (الأصغر تحت)، ومكان الكومة كنسبة من الدائرة.
  // x و y: مركز الكومة. w: عرضها. كل الكومات مايلة -45 درجة.
  const INGREDIENTS = {
    chicken:  { ar: 'دجاج',          z: 20, x: 50, y: 48, w: 60 },
    meat:     { ar: 'لحمة',          z: 21, x: 50, y: 48, w: 60 },
    falafel:  { ar: 'فلافل',         z: 22, x: 50, y: 48, w: 56 },
    toum:     { ar: 'ثوم',           z: 10, x: 28, y: 64, w: 30 },
    tahini:   { ar: 'طحينة',         z: 11, x: 70, y: 66, w: 32 },
    molasses: { ar: 'دبس رمان',      z: 12, x: 70, y: 28, w: 28 },
    cheese:   { ar: 'جبنة',          z: 25, x: 50, y: 50, w: 40 },
    fries:    { ar: 'بطاطا',         z: 30, x: 58, y: 75, w: 34 },
    pickle:   { ar: 'مخلل',          z: 40, x: 62, y: 40, w: 28 },
    turnip:   { ar: 'لفت',           z: 41, x: 32, y: 32, w: 28 },
    tomato:   { ar: 'بندورة',        z: 42, x: 66, y: 60, w: 26 },
    onion:    { ar: 'بصل وبقدونس',   z: 43, x: 38, y: 28, w: 28 },
    parsley:  { ar: 'بقدونس',        z: 44, x: 72, y: 48, w: 24 },
    sumac:    { ar: 'سماق',          z: 50, x: 50, y: 40, w: 22 },
    ketchup:  { ar: 'كاتشب' },
    salad:    { ar: 'سلطة' },
    bread:    { ar: 'خبز' },
    salt:     { ar: 'ملح' },
    spice:    { ar: 'بهار' },
    oil:      { ar: 'زيت زيتون' },
    pine:     { ar: 'صنوبر' },
    sugar:    { ar: 'سكر' },
    ice:      { ar: 'ثلج' },
    mint:     { ar: 'نعنع' }
  };

  const CATEGORIES = [
    { id: 'sandwiches', ar: 'سندويشات' },
    { id: 'meals',      ar: 'وجبات' },
    { id: 'sides',      ar: 'جانبي' },
    { id: 'drinks',     ar: 'مشروبات' }
  ];

  // base: المكونات الأساسية يلي بتنرسم على الخبزة دايماً وما بتتغير.
  const ITEMS = [
    { id: 'chicken', name: 'شاورما دجاج',     cat: 'sandwiches', price: 2.50, desc: 'دجاج متبّل على السيخ، ملفوف بخبز صاج سخن.',     base: ['chicken'],          mods: ['toum', 'pickle', 'turnip', 'fries', 'tomato', 'molasses'] },
    { id: 'meat',    name: 'شاورما لحمة',     cat: 'sandwiches', price: 3.00, desc: 'لحمة عجل على السيخ مع طحينة وبصل بالسماق.',    base: ['meat'],             mods: ['tahini', 'onion', 'tomato', 'pickle', 'sumac'] },
    { id: 'falafel', name: 'فلافل',           cat: 'sandwiches', price: 1.25, desc: 'فلافل مقرمشة طالعة هلأ من الزيت.',              base: ['falafel'],          mods: ['tahini', 'tomato', 'pickle', 'parsley', 'turnip'] },
    { id: 'special', name: 'سبيشال جمر',      cat: 'sandwiches', price: 4.00, desc: 'دجاج ولحمة مع جبنة، أكبر سندويشة عنا.',         base: ['chicken', 'meat'],  mods: ['cheese', 'toum', 'pickle', 'fries', 'molasses'] },
    { id: 'arabi',   name: 'عربي دجاج',       cat: 'meals',      price: 4.50, desc: 'شاورما مقطعة مع بطاطا وثوم ومخلل.',             mods: ['toum', 'pickle', 'fries', 'ketchup'] },
    { id: 'plate',   name: 'صحن شاورما لحمة', cat: 'meals',      price: 5.50, desc: 'لحمة على صحن مع طحينة وسلطة وخبز.',             mods: ['tahini', 'salad', 'fries', 'bread'] },
    { id: 'fries',   name: 'بطاطا',           cat: 'sides',      price: 1.00, desc: 'مقرمشة، مع ملح وبهار.',                         mods: ['salt', 'spice', 'ketchup'] },
    { id: 'hummus',  name: 'حمص',             cat: 'sides',      price: 1.50, desc: 'حمص ناعم بزيت زيتون.',                          mods: ['oil', 'pine', 'bread'] },
    { id: 'lemon',   name: 'ليمون ونعنع',     cat: 'drinks',     price: 1.50, desc: 'معصور هلأ.',                                    mods: ['sugar', 'ice', 'mint'] },
    { id: 'cola',    name: 'كولا',            cat: 'drinks',     price: 0.75, desc: 'باردة.',                                        mods: ['ice'] }
  ];

  const MENU = {
    INGREDIENTS,
    CATEGORIES,
    ITEMS,
    EXTRA_PRICE: 0.25,
    LEVELS: ['none', 'normal', 'extra']
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MENU;
  else root.MENU = MENU;
})(typeof window !== 'undefined' ? window : this);
