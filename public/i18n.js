/* عربي / English: قاموس + أنماط للنصوص يلي فيها أرقام وأسماء.
   MutationObserver بيترجم أي نص بيطلع بعدين. اسم «جمر» بيضل عربي. */
(function () {
  'use strict';

  const ING = {
    'دجاج': 'Chicken', 'لحمة': 'Meat', 'فلافل': 'Falafel', 'ثوم': 'Garlic', 'طحينة': 'Tahini',
    'دبس رمان': 'Pomegranate molasses', 'جبنة': 'Cheese', 'بطاطا': 'Fries', 'مخلل': 'Pickles',
    'لفت': 'Pickled turnip', 'بندورة': 'Tomato', 'بصل وبقدونس': 'Onion & parsley', 'بقدونس': 'Parsley',
    'سماق': 'Sumac', 'كاتشب': 'Ketchup', 'سلطة': 'Salad', 'خبز': 'Bread', 'ملح': 'Salt', 'بهار': 'Spices',
    'زيت زيتون': 'Olive oil', 'صنوبر': 'Pine nuts', 'سكر': 'Sugar', 'ثلج': 'Ice', 'نعنع': 'Mint'
  };

  const ITEMS = {
    'شاورما دجاج': 'Chicken shawarma',
    'شاورما لحمة': 'Meat shawarma',
    'سبيشال جمر': 'جمر Special',
    'عربي دجاج': 'Chicken Arabi',
    'صحن شاورما لحمة': 'Meat shawarma plate',
    'حمص': 'Hummus',
    'ليمون ونعنع': 'Lemon & mint',
    'كولا': 'Cola'
  };

  const DICT = Object.assign({}, ING, ITEMS, {
    // الصفحة
    'جمر | شاورما على الجمر، عمّان': 'جمر | Charcoal shawarma, Amman',
    'انتقل للمنيو': 'Skip to menu',
    'سيخ الشاورما على الجمر': 'Shawarma spit over the coals',
    'شاورما على الجمر، بتختارها متل ما بتحب.': 'Shawarma over the coals, built the way you like it.',
    'شارع الرينبو، عمّان': 'Rainbow Street, Amman',
    'مفتوح هلأ لـ 2 بالليل': 'Open now until 2 AM',
    'مسكّر هلأ، منفتح الساعة 12 الظهر': 'Closed now. We open at 12 noon.',
    'اطلب الآن': 'Order now',
    'اطلب هلأ': 'Order now',
    'من الصاج لإيدك': 'From the saj to your hand',
    'هون بينحط فيديو تحضير السندويشة': 'The sandwich-making video goes here',
    'المنيو': 'Menu',
    'أقسام المنيو': 'Menu sections',
    'سندويشات': 'Sandwiches', 'وجبات': 'Meals', 'جانبي': 'Sides', 'مشروبات': 'Drinks',
    'من مطبخنا': 'From our kitchen',
    'من مطبخ جمر': 'Inside the جمر kitchen',
    'لاقينا': 'Find us',
    'العنوان': 'Address',
    'عمّان، جبل عمّان، شارع الرينبو': 'Rainbow Street, Jabal Amman, Amman',
    'الدوام': 'Hours',
    'كل يوم من 12 الظهر لـ 2 بالليل': 'Every day, 12 noon to 2 AM',
    'التلفون': 'Phone',
    'واتساب': 'WhatsApp',
    'إنستغرام': 'Instagram',
    'خريطة موقع جمر': 'Map to جمر',

    // الأصناف
    'دجاج متبّل على السيخ، ملفوف بخبز صاج سخن.': 'Marinated chicken off the spit, wrapped in hot saj bread.',
    'لحمة عجل على السيخ مع طحينة وبصل بالسماق.': 'Veal off the spit with tahini and sumac onions.',
    'فلافل مقرمشة طالعة هلأ من الزيت.': 'Crispy falafel, straight out of the oil.',
    'دجاج ولحمة مع جبنة، أكبر سندويشة عنا.': 'Chicken and meat with cheese. Our biggest sandwich.',
    'شاورما مقطعة مع بطاطا وثوم ومخلل.': 'Sliced shawarma with fries, garlic and pickles.',
    'لحمة على صحن مع طحينة وسلطة وخبز.': 'Meat on a plate with tahini, salad and bread.',
    'مقرمشة، مع ملح وبهار.': 'Crispy, with salt and spices.',
    'حمص ناعم بزيت زيتون.': 'Smooth hummus with olive oil.',
    'معصور هلأ.': 'Freshly squeezed.',
    'باردة.': 'Ice cold.',

    // نافذة التخصيص
    'بدون': 'None', 'عادي': 'Regular', 'زيادة': 'Extra',
    'سكّر': 'Close', 'الكمية': 'Quantity', 'نقّص': 'Less', 'زيد': 'More',

    // السلة والطلب
    'كمّل الطلب': 'Checkout',
    'صنف واحد': '1 item',
    'صنفين': '2 items',
    'ارجع للمنيو': 'Back to menu',
    'كمّل طلبك': 'Finish your order',
    'كيف بدك طلبك؟': 'How do you want it?',
    'توصيل': 'Delivery', 'استلام': 'Pickup', 'بالمطعم': 'Dine in',
    'استخدم موقعي': 'Use my location',
    'العنوان بالتفصيل': 'Full address',
    'المنطقة، الشارع، رقم البناية، الطابق': 'Area, street, building number, floor',
    'رسوم التوصيل 1.00 د.أ': 'Delivery fee JD 1.00',
    'إمتى بتمرق؟': 'When are you coming by?',
    'بعد 15 دقيقة': 'In 15 minutes', 'بعد 30 دقيقة': 'In 30 minutes', 'بعد ساعة': 'In an hour',
    'كم شخص؟': 'How many people?',
    'إمتى؟': 'What time?',
    'الاسم': 'Name',
    'رقم التلفون': 'Phone number',
    'وين نبعتلك لما يجهز؟': 'How should we tell you it’s ready?',
    'إشعار عالمتصفح': 'Browser notification',
    'الدفع كاش عند الاستلام.': 'You pay cash when you get your order.',
    'ابعت الطلب': 'Place order',
    'عم نبعت الطلب…': 'Placing your order…',
    'الفاتورة': 'Your bill',
    'التوصيل': 'Delivery',
    'المجموع': 'Total',
    'شيل': 'Remove',
    'خريطة موقعك': 'Map of your location',
    'السلة فاضية. زيد صنف من المنيو.': 'Your cart is empty. Add something from the menu.',
    'متصفحك ما بيدعم تحديد الموقع. اكتب عنوانك تحت.': 'Your browser can’t share your location. Type your address below.',
    'عم نحدد موقعك…': 'Finding your location…',
    'جرّب الاستلام': 'Try pickup',
    'المتصفح ما سمح نعرف موقعك. اسمحله من إعدادات المتصفح، أو اكتب عنوانك تحت.': 'Your browser blocked location access. Allow it in your browser settings, or type your address below.',
    'ما قدرنا نحدد موقعك. جرّب كمان مرة، أو اكتب عنوانك تحت.': 'We couldn’t find your location. Try again, or type your address below.',
    'اكتب عنوانك بالتفصيل: المنطقة، الشارع، رقم البناية.': 'Type your full address: area, street, building number.',
    'عدد الأشخاص لازم يكون بين 1 و 20.': 'Number of people must be between 1 and 20.',
    'اختار الساعة يلي بدك تيجي فيها.': 'Pick the time you’re coming.',
    'اكتب اسمك عشان نعرف لمين الطلب.': 'Type your name so we know whose order it is.',
    'الرقم لازم يكون أردني، متل 0791234567.': 'Use a Jordanian mobile number, like 0791234567.',
    'اختار طريقة الطلب: توصيل، أو استلام، أو بالمطعم.': 'Choose delivery, pickup, or dine in.',
    'السلة فيها أصناف كتير.': 'Your cart has too many items.',
    'في صنف بالسلة مش موجود بالمنيو. شيله وجرّب كمان مرة.': 'An item in your cart is no longer on the menu. Remove it and try again.',
    'اختار إمتى بتمرق: بعد 15 دقيقة، أو 30، أو ساعة.': 'Choose when you’re coming: in 15 minutes, 30, or an hour.',
    'صار خطأ بالسيرفر. جرّب كمان مرة.': 'Something went wrong on our side. Try again.',
    'البيانات المبعوتة مش JSON صحيح.': 'The order data was unreadable. Refresh the page and try again.',
    'ما قدرنا نبعت الطلب. جرّب كمان مرة.': 'Your order didn’t go through. Try again.',
    'ما قدرنا نوصل للمطعم. تأكد من الإنترنت وجرّب كمان مرة.': 'We couldn’t reach the restaurant. Check your internet and try again.',

    // طريقة الطلب
    'سفري': 'Takeaway',
    'بتاخده معك': 'Take it with you',
    'جوا المطعم': 'Dine in',
    'بتاكله عنّا': 'Eat it here with us',
    'رقم الطاولة': 'Table number',
    '(اختياري)': '(optional)',
    'رقم الطاولة لازم يكون بين 1 و 30، أو خلّيه فاضي.': 'Table number must be 1 to 30, or leave it empty.',
    'نوع الطلب لازم يكون سفري أو جوا المطعم.': 'Choose takeaway or dine in.',
    'راسلنا على واتساب': 'Message us on WhatsApp',
    'اتصل فينا': 'Call us',

    // الحالات والرسائل
    'بالمطبخ': 'In the kitchen',
    'جاهز': 'Ready',
    'تم التسليم': 'Delivered',
    'طلبك عالجمر هلأ.': 'Your order is on the coals now.',
    'صحتين! شكراً إنك اخترت جمر.': 'Enjoy! Thanks for choosing جمر.',

    // المتابعة
    'انطلب': 'Ordered',
    'عم يتحضر': 'Preparing',
    'مع السائق': 'With the driver',
    'وصل': 'Delivered',
    'جاهز للاستلام': 'Ready for pickup',
    'عالطاولة': 'At your table',
    'اطلب كمان': 'Order again',
    'ما في طلب حالي': 'No current order',
    'اختار من المنيو وابعت طلبك، وبتقدر تتابعه من هون.': 'Pick from the menu and place your order. You can follow it here.',
    'ما لقينا هالطلب. إذا عندك سؤال، اتصل فينا على 078 618 1892.': 'We couldn’t find this order. Questions? Call us on 078 618 1892.',
    'طلبك عم يتحضر هلأ على الجمر.': 'Your order is on the coals right now.',
    'وصل طلبك. صحتين وعافية!': 'Your order has arrived. Enjoy!'
  });

  const money = '(\\d+\\.\\d{2}) د\\.أ';
  const ingEn = s => (ING[s] || s);
  const nameEn = s => (ITEMS[s] || ING[s] || s);

  function modsEn(text) {
    return text.split('، ').map(part => {
      if (part.startsWith('زيادة ')) return 'Extra ' + ingEn(part.slice(6)).toLowerCase();
      if (part.startsWith('بدون ')) return 'No ' + ingEn(part.slice(5)).toLowerCase();
      return part;
    }).join(', ');
  }

  const PATTERNS = [
    [new RegExp('^' + money + '$'), (_, n) => `JD ${n}`],
    [new RegExp('^زيد عالسلة \\(' + money + '\\)$'), (_, n) => `Add to cart (JD ${n})`],
    [/^طلب رقم (\d+)$/, (_, n) => `Order #${n}`],
    [/^(\d+) (أصناف|صنف)$/, (_, n) => `${n} items`],
    [/^انضاف «(.+)» للسلة\.$/, (_, n) => `Added ${nameEn(n)} to your cart.`],
    [/^شيل (.+)$/, (_, n) => `Remove ${nameEn(n)}`],
    [/^خبزة (.+) مع المكونات يلي اخترتها$/, (_, n) => `${nameEn(n)} with your toppings`],
    [/^كمية «(.+)» لازم تكون بين 1 و 20\.$/, (_, n) => `Quantity of ${nameEn(n)} must be between 1 and 20.`],
    [/^موقعك على بعد ([\d.]+) كم من المطعم\.$/, (_, n) => `You’re ${n} km from us.`],
    [/^موقعك على بعد ([\d.]+) كم، والتوصيل لحد (\d+) كم بس\.$/, (_, n, m) => `You’re ${n} km away, and we deliver up to ${m} km.`],
    [/^موقعك على بعد ([\d.]+) كم، والتوصيل لحد (\d+) كم بس\. جرّب الاستلام\.$/, (_, n, m) => `You’re ${n} km away, and we deliver up to ${m} km. Try pickup.`],
    [/^موقعك بعيد ([\d.]+) كم، والتوصيل لحد (\d+) كم بس\. جرّب الاستلام\.$/, (_, n, m) => `You’re ${n} km away, and we deliver up to ${m} km. Try pickup.`],
    [/^أهلين (.+)، وصلنا طلبك من جمر\. رقم طلبك (\d+)\.$/, (_, n, no) => `Hi ${n}, جمر got your order. Your order number is ${no}.`],
    [/^يا (.+)، طلبك طلع مع السائق، وصار بالطريق لعندك\.$/, (_, n) => `${n}, your order is with the driver and on its way.`],
    [/^يا (.+)، طلبك جاهز\. تفضل استلمه\.$/, (_, n) => `${n}, your order is ready. Come pick it up.`],
    [/^يا (.+)، طلبك طالع عالطاولة هلأ\.$/, (_, n) => `${n}, your order is on its way to your table.`],
    [/^جوا المطعم، طاولة (\d+)$/, (_, n) => `Dine in, table ${n}`],
    [/^جاهز خلال (\d+) دقيقة تقريباً$/, (_, n) => `Ready in about ${n} minutes`],
    [/^أهلين (.+)، وصلنا طلبك رقم (\d+)\.$/, (_, n, no) => `Hi ${n}, we got your order #${no}.`],
    [/^طلبك عالجمر هلأ، بيجهز خلال (\d+) دقيقة تقريباً\.$/, (_, m) => `Your order is on the coals now. Ready in about ${m} minutes.`],
    [/^يا (.+)، طلبك جاهز\. تفضل استلمه من الكاونتر\.$/, (_, n) => `${n}, your order is ready. Pick it up at the counter.`],
    [/^يا (.+)، أكلك طالع لطاولتك\.$/, (_, n) => `${n}, your food is on its way to your table.`],
    [/^(زيادة|بدون) .+(، (زيادة|بدون) .+)*$/, m => modsEn(m)]
  ];

  let lang = 'ar';
  try { lang = localStorage.getItem('jamr-lang') === 'en' ? 'en' : 'ar'; } catch {}

  function tr(text) {
    if (lang !== 'en' || !text) return text;
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(text);
    const core = m[2];
    if (!core) return text;
    if (Object.prototype.hasOwnProperty.call(DICT, core)) return m[1] + DICT[core] + m[3];
    for (const [re, fn] of PATTERNS) {
      const mm = re.exec(core);
      if (mm) return m[1] + fn(...mm) + m[3];
    }
    return text;
  }

  const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  const SKIP = 'script, style, [data-no-i18n]';

  function doText(node) {
    const parent = node.parentElement;
    if (!parent || parent.closest(SKIP)) return;
    if (node.__tr !== node.data) node.__ar = node.data; // النص تغيّر من التطبيق: هاد الأصل الجديد
    if (lang === 'en') {
      const t = tr(node.__ar);
      node.__tr = t;
      if (node.data !== t) node.data = t;
    } else if (node.__ar != null && node.data !== node.__ar) {
      node.__tr = node.__ar;
      node.data = node.__ar;
    } else {
      node.__tr = node.data;
    }
  }

  function doAttrs(elm) {
    if (elm.closest(SKIP)) return;
    elm.__attrAr = elm.__attrAr || {};
    elm.__attrTr = elm.__attrTr || {};
    for (const a of ATTRS) {
      if (!elm.hasAttribute(a)) continue;
      const cur = elm.getAttribute(a);
      if (elm.__attrTr[a] !== cur) elm.__attrAr[a] = cur;
      const want = lang === 'en' ? tr(elm.__attrAr[a]) : elm.__attrAr[a];
      elm.__attrTr[a] = want;
      if (cur !== want) elm.setAttribute(a, want);
    }
  }

  function walk(root) {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1) return;
    if (root.matches && root.matches(SKIP)) return;
    doAttrs(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n;
    while ((n = tw.nextNode())) {
      if (n.nodeType === 3) doText(n);
      else doAttrs(n);
    }
  }

  let titleAr = document.title;
  function applyTitle() {
    if (lang === 'en') document.title = tr(titleAr);
    else document.title = titleAr;
  }

  function apply() {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = lang === 'en' ? 'ltr' : 'rtl';
    const btn = document.getElementById('langToggle');
    if (btn) {
      btn.textContent = lang === 'en' ? 'عربي' : 'English';
      btn.setAttribute('lang', lang === 'en' ? 'ar' : 'en');
      btn.setAttribute('aria-label', lang === 'en' ? 'اقرأ الموقع بالعربي' : 'Read the site in English');
    }
    walk(document.body);
    applyTitle();
  }

  function setLang(next) {
    lang = next === 'en' ? 'en' : 'ar';
    try { localStorage.setItem('jamr-lang', lang); } catch {}
    apply();
  }

  new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') { if (m.target.nodeType === 1) doAttrs(m.target); }
      else m.addedNodes.forEach(walk);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });

  const btn = document.getElementById('langToggle');
  if (btn) btn.addEventListener('click', () => setLang(lang === 'en' ? 'ar' : 'en'));

  apply();

  window.JamrI18n = { tr: text => tr(text), setLang, get lang() { return lang; } };
})();
