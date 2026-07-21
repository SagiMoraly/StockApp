import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';

export type AppLanguage = 'en' | 'he';

type TranslationParams = Record<string, string | number>;

type TranslationCatalog = Record<string, string>;

type LocalizationContextValue = {
  language: AppLanguage;
  isRTL: boolean;
  t: (key: string, params?: TranslationParams) => string;
  setLanguage: (nextLanguage: AppLanguage) => Promise<{ restartRequired: boolean }>;
};

const LANGUAGE_STORAGE_KEY = 'stockup.language.preference';
const DEFAULT_LANGUAGE: AppLanguage = 'en';

const translations: Record<AppLanguage, TranslationCatalog> = {
  en: {
    'common.done': 'Done',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.add': 'Add',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.save': 'Save',
    'common.clear': 'Clear',
    'common.all': 'All',
    'common.items': 'Items',
    'common.type': 'Type',
    'common.colors': 'Colors',
    'common.quantity': 'Quantity',
    'common.share': 'Share',
    'common.import': 'Import',

    'settings.appearanceTitle': 'Appearance',
    'settings.themeTitle': 'Theme',
    'settings.languageTitle': 'Language',
    'settings.restartRequiredTitle': 'Restart required',
    'settings.restartRequiredMessage': 'Please restart the app to apply layout direction changes.',
    'theme.system': 'System',
    'theme.systemDescription': 'Follows your device setting',
    'theme.light': 'Light',
    'theme.lightDescription': 'Always use light mode',
    'theme.dark': 'Dark',
    'theme.darkDescription': 'Always use dark mode',
    'language.english': 'English',
    'language.hebrew': 'Hebrew',

    'tabs.home': 'Home',
    'tabs.recipes': 'Recipes',
    'tabs.list': 'List',
    'tabs.items': 'Items',

    'home.greetingMorning': 'Good morning',
    'home.greetingAfternoon': 'Good afternoon',
    'home.greetingEvening': 'Good evening',
    'home.heading': 'What are we cooking today?',
    'home.searchPlaceholder': 'Search recipes or ingredients',
    'home.quickActions': 'Quick actions',
    'home.browseRecipes': 'Browse Recipes',
    'home.createGroceryList': 'Create Grocery List',
    'home.startStaplesTitle': 'Start with your staples',
    'home.startStaplesText': 'Build your item list first, then recipes and grocery lists stay faster to manage.',
    'home.recentRecipes': 'Recent recipes',
    'home.yourUpcomingList': 'Your upcoming list',
    'home.viewAll': 'View all',
    'home.noRecipesTitle': 'No recipes yet',
    'home.noRecipesText': 'Add your first recipe to start building meal plans and grocery lists.',
    'home.listItemsCount': '{{count}} items',
    'home.emptyListInline': 'Your grocery list is empty. Add items or ingredients to get started.',
    'home.addRecipeCardTitle': 'Add a recipe to your list',
    'home.addRecipeCardText': 'Tap a recipe to add all ingredients to your grocery list.',
    'home.openAppearanceSettingsA11y': 'Open appearance settings',

    'recipes.title': 'Recipes',
    'recipes.addButton': 'Add',
    'recipes.searchPlaceholder': 'Search recipes',
    'recipes.favorites': 'Favorites',
    'recipes.noRecipesTitle': 'No recipes yet',
    'recipes.noRecipesText': 'Create your first recipe to start building lists from ingredients.',

    'category.All': 'All',
    'category.Breakfast': 'Breakfast',
    'category.Lunch': 'Lunch',
    'category.Dinner': 'Dinner',
    'category.Dessert': 'Dessert',

    'difficulty.Easy': 'Easy',
    'difficulty.Medium': 'Medium',
    'difficulty.Hard': 'Hard',

    'list.title': 'Grocery List',
    'list.edit': 'Edit',
    'list.done': 'Done',
    'list.filterAll': 'All ({{count}})',
    'list.filterRemaining': 'To Buy ({{count}})',
    'list.filterBought': 'Bought ({{count}})',
    'list.sectionItemsCount': '{{count}} items',
    'list.emptyTitle': 'Nothing in this view yet',
    'list.emptyText': 'Switch filters or add items with the Add Items button below.',
    'list.addItemsButton': 'Add Items',
    'list.clearTitle': 'Clear grocery list?',
    'list.clearMessage': 'This will remove every item from your list.',

    'pantry.title': 'Items',
    'pantry.subtitle': 'Manage item details and food types in separate sections.',
    'pantry.addItem': 'Add Item',
    'pantry.editItem': 'Edit Item',
    'pantry.itemNamePlaceholder': 'Item name',
    'pantry.itemUnitPlaceholder': 'Optional unit, like bag or clove',
    'pantry.manageTypesTitle': 'Manage Types',
    'pantry.manageTypesHelp': 'Edit or delete food type groups.',
    'pantry.addType': 'Add Type',
    'pantry.editingType': 'Editing type',
    'pantry.newType': 'New type',
    'pantry.typeNamePlaceholder': 'Type name',
    'pantry.saveType': 'Save Type',
    'pantry.allItemsTitle': 'All Items',
    'pantry.allItemsHelp': 'Tap Edit to modify the selected item.',
    'pantry.searchItemsPlaceholder': 'Search items',
    'pantry.noItemsFiltered': 'No items found in this filter.',
    'pantry.deleteItemTitle': 'Delete this item?',
    'pantry.deleteItemMessage': '{{name}} will be removed from the shared catalog.',
    'pantry.deleteTypeTitle': 'Delete this type?',
    'pantry.deleteTypeMessage': '{{label}} and its {{count}} items will be removed from the shared catalog.',
    'pantry.editingItemHint': 'You are editing this item',
    'pantry.typeItemsCount': '{{count}} items',

    'pantry.status.needsOneColor': 'Each item needs at least one color.',
    'pantry.status.editingItem': 'Editing item: {{name}}',
    'pantry.status.itemNameRequired': 'Item name is required.',
    'pantry.status.pickOneColor': 'Pick at least one color.',
    'pantry.status.itemSaveFailed': 'Could not save this item. Use a unique item name.',
    'pantry.status.itemSaved': '{{name}} saved.',
    'pantry.status.itemExists': 'That item already exists.',
    'pantry.status.itemAdded': '{{name}} added.',
    'pantry.status.editingType': 'Editing type: {{name}}',
    'pantry.status.renameTypeFailed': 'Could not rename this type.',
    'pantry.status.typeRenamed': 'Type renamed to {{name}}.',
    'pantry.status.addTypeFailed': 'Could not add this type.',
    'pantry.status.typeAdded': 'Type {{name}} added.',
    'pantry.status.typeDeleted': 'Type {{name}} deleted.',
    'pantry.status.itemDeleted': '{{name}} deleted.',
    'pantry.status.deleteItemFailed': 'Could not delete item.',
    'pantry.status.keepOneType': 'Keep at least one type.',

    'addItems.title': 'Add Items',
    'addItems.searchPlaceholder': 'Search items, type, or unit',
    'addItems.noneFound': 'No items match the selected type and search.',
    'addItems.submit': 'Add Items ({{count}})',

    'addToList.title': 'Add to Grocery List',
    'addToList.helper': 'Add all {{count}} ingredients to:',
    'addToList.submit': 'Add {{count}} Items',

    'confirm.cancel': 'Cancel',

    'listEdit.title': 'Edit List',
    'listEdit.newItemSection': 'Add a new item',
    'listEdit.availableItemsLabel': 'Available items',
    'listEdit.chooseSharedItems': 'Choose from your shared items',
    'listEdit.helper': 'Add new shared items from the Items tab, then select them here.',
    'listEdit.currentItems': 'Current items',
    'listEdit.emptySection': 'No items in this section.',

    'itemPicker.chooseItem': 'Choose an item',
    'itemPicker.searchPlaceholder': 'Search available items',
    'itemPicker.empty': 'No items matched your search.',

    'recipeCard.addPhoto': 'Add a photo',

    'recipeDetail.addPhoto': 'Add a recipe photo',
    'recipeDetail.ingredients': 'Ingredients',
    'recipeDetail.addToList': 'Add to List',

    'shareImport.title': 'Import Shared Data',
    'shareImport.helper': 'Paste a StockUp share message here to preview what will be added.',
    'shareImport.placeholder': 'Paste shared text...',
    'shareImport.submit': 'Preview Import',
    'shareImport.invalid': 'This does not look like a valid StockUp share message.',

    'importPreview.title': 'Confirm Import',
    'importPreview.missingItemsTitle': 'New items to add to your Items catalog',
    'importPreview.noMissingItems': 'All shared items already exist in your catalog.',
    'importPreview.recipeMessage': 'Recipe "{{name}}" will be added with {{count}} ingredients.',
    'importPreview.listMessage': '{{count}} grocery items will be merged into "{{name}}".',
    'importPreview.confirmRecipe': 'Add Recipe',
    'importPreview.confirmList': 'Add Grocery Items',

    'recipeEdit.permissionTitle': 'Permission needed',
    'recipeEdit.permissionMessage': 'Please allow photo library access to select a recipe image, or keep going without one.',
    'recipeEdit.untitled': 'Untitled Recipe',
    'recipeEdit.addRecipe': 'Add Recipe',
    'recipeEdit.editRecipe': 'Edit Recipe',
    'recipeEdit.pickImage': 'Pick image',
    'recipeEdit.titlePlaceholder': 'Title',
    'recipeEdit.subtitlePlaceholder': 'Subtitle',
    'recipeEdit.descriptionPlaceholder': 'Description',
    'recipeEdit.time': 'Time',
    'recipeEdit.mins': 'mins',
    'recipeEdit.difficulty': 'Difficulty',
    'recipeEdit.chooseDifficulty': 'Choose difficulty',
    'recipeEdit.servings': 'Servings',
    'recipeEdit.servingsSuffix': 'servings',
    'recipeEdit.category': 'Category',
    'recipeEdit.ingredients': 'Ingredients',
    'recipeEdit.chooseItem': 'Choose item',
    'recipeEdit.countUnit': 'count',
    'recipeEdit.itemUnit': 'item',
    'recipeEdit.emptyIngredients': 'Choose items from your item list to build this recipe.',
    'recipeEdit.createRecipe': 'Create Recipe',
    'recipeEdit.saveRecipe': 'Save Recipe',

    'success.itemsAdded': '{{count}} items added!',
    'success.addedToList': 'They\'ve been added to "{{name}}".',
    'success.viewList': 'View Grocery List',
  },
  he: {
    'common.done': 'סיום',
    'common.cancel': 'ביטול',
    'common.close': 'סגירה',
    'common.add': 'הוספה',
    'common.edit': 'עריכה',
    'common.delete': 'מחיקה',
    'common.save': 'שמירה',
    'common.clear': 'ניקוי',
    'common.all': 'הכל',
    'common.items': 'פריטים',
    'common.type': 'סוג',
    'common.colors': 'צבעים',
    'common.quantity': 'כמות',
    'common.share': 'שיתוף',
    'common.import': 'ייבוא',

    'settings.appearanceTitle': 'מראה',
    'settings.themeTitle': 'ערכת נושא',
    'settings.languageTitle': 'שפה',
    'settings.restartRequiredTitle': 'נדרשת הפעלה מחדש',
    'settings.restartRequiredMessage': 'יש להפעיל מחדש את האפליקציה כדי להחיל שינוי כיוון תצוגה.',
    'theme.system': 'מערכת',
    'theme.systemDescription': 'בהתאם להגדרות המכשיר',
    'theme.light': 'בהיר',
    'theme.lightDescription': 'תמיד מצב בהיר',
    'theme.dark': 'כהה',
    'theme.darkDescription': 'תמיד מצב כהה',
    'language.english': 'אנגלית',
    'language.hebrew': 'עברית',

    'tabs.home': 'בית',
    'tabs.recipes': 'מתכונים',
    'tabs.list': 'רשימה',
    'tabs.items': 'פריטים',

    'home.greetingMorning': 'בוקר טוב',
    'home.greetingAfternoon': 'צהריים טובים',
    'home.greetingEvening': 'ערב טוב',
    'home.heading': 'מה מבשלים היום?',
    'home.searchPlaceholder': 'חיפוש מתכונים או מרכיבים',
    'home.quickActions': 'פעולות מהירות',
    'home.browseRecipes': 'עיון במתכונים',
    'home.createGroceryList': 'יצירת רשימת קניות',
    'home.startStaplesTitle': 'מתחילים עם הבסיס',
    'home.startStaplesText': 'הגדירו קודם את הפריטים הקבועים, ואז ניהול מתכונים ורשימות קניות יהיה מהיר יותר.',
    'home.recentRecipes': 'מתכונים אחרונים',
    'home.yourUpcomingList': 'הרשימה הקרובה שלך',
    'home.viewAll': 'לצפייה בהכל',
    'home.noRecipesTitle': 'עדיין אין מתכונים',
    'home.noRecipesText': 'הוסיפו את המתכון הראשון כדי להתחיל לבנות תכנון ארוחות ורשימות קניות.',
    'home.listItemsCount': '{{count}} פריטים',
    'home.emptyListInline': 'רשימת הקניות ריקה. הוסיפו פריטים או מרכיבים כדי להתחיל.',
    'home.addRecipeCardTitle': 'הוספת מתכון לרשימה',
    'home.addRecipeCardText': 'הקישו על מתכון כדי להוסיף את כל המרכיבים לרשימת הקניות.',
    'home.openAppearanceSettingsA11y': 'פתיחת הגדרות מראה',

    'recipes.title': 'מתכונים',
    'recipes.addButton': 'הוספה',
    'recipes.searchPlaceholder': 'חיפוש מתכונים',
    'recipes.favorites': 'מועדפים',
    'recipes.noRecipesTitle': 'עדיין אין מתכונים',
    'recipes.noRecipesText': 'צרו מתכון ראשון כדי להתחיל לבנות רשימות ממרכיבים.',

    'category.All': 'הכל',
    'category.Breakfast': 'ארוחת בוקר',
    'category.Lunch': 'ארוחת צהריים',
    'category.Dinner': 'ארוחת ערב',
    'category.Dessert': 'קינוח',

    'difficulty.Easy': 'קל',
    'difficulty.Medium': 'בינוני',
    'difficulty.Hard': 'קשה',

    'list.title': 'רשימת קניות',
    'list.edit': 'עריכה',
    'list.done': 'סיום',
    'list.filterAll': 'הכל ({{count}})',
    'list.filterRemaining': 'לקנייה ({{count}})',
    'list.filterBought': 'נקנה ({{count}})',
    'list.sectionItemsCount': '{{count}} פריטים',
    'list.emptyTitle': 'עדיין אין פריטים בתצוגה הזו',
    'list.emptyText': 'עברו בין מסננים או הוסיפו פריטים עם כפתור הוספת פריטים למטה.',
    'list.addItemsButton': 'הוספת פריטים',
    'list.clearTitle': 'לנקות את רשימת הקניות?',
    'list.clearMessage': 'הפעולה תסיר את כל הפריטים מהרשימה.',

    'pantry.title': 'פריטים',
    'pantry.subtitle': 'ניהול פרטי פריטים וסוגי מזון בחלקים נפרדים.',
    'pantry.addItem': 'הוספת פריט',
    'pantry.editItem': 'עריכת פריט',
    'pantry.itemNamePlaceholder': 'שם פריט',
    'pantry.itemUnitPlaceholder': 'יחידת מידה אופציונלית, למשל שקית או שן',
    'pantry.manageTypesTitle': 'ניהול סוגים',
    'pantry.manageTypesHelp': 'עריכה או מחיקה של קבוצות סוגי מזון.',
    'pantry.addType': 'הוספת סוג',
    'pantry.editingType': 'עריכת סוג',
    'pantry.newType': 'סוג חדש',
    'pantry.typeNamePlaceholder': 'שם סוג',
    'pantry.saveType': 'שמירת סוג',
    'pantry.allItemsTitle': 'כל הפריטים',
    'pantry.allItemsHelp': 'לחצו על עריכה כדי לעדכן את הפריט שנבחר.',
    'pantry.searchItemsPlaceholder': 'חיפוש פריטים',
    'pantry.noItemsFiltered': 'לא נמצאו פריטים במסנן הזה.',
    'pantry.deleteItemTitle': 'למחוק את הפריט הזה?',
    'pantry.deleteItemMessage': '{{name}} יוסר מהקטלוג המשותף.',
    'pantry.deleteTypeTitle': 'למחוק את הסוג הזה?',
    'pantry.deleteTypeMessage': '{{label}} ו-{{count}} הפריטים שלו יוסרו מהקטלוג המשותף.',
    'pantry.editingItemHint': 'אתם עורכים את הפריט הזה',
    'pantry.typeItemsCount': '{{count}} פריטים',

    'pantry.status.needsOneColor': 'לכל פריט חייב להיות לפחות צבע אחד.',
    'pantry.status.editingItem': 'עריכת פריט: {{name}}',
    'pantry.status.itemNameRequired': 'שם פריט הוא שדה חובה.',
    'pantry.status.pickOneColor': 'בחרו לפחות צבע אחד.',
    'pantry.status.itemSaveFailed': 'לא ניתן לשמור את הפריט הזה. השתמשו בשם ייחודי.',
    'pantry.status.itemSaved': '{{name}} נשמר.',
    'pantry.status.itemExists': 'הפריט הזה כבר קיים.',
    'pantry.status.itemAdded': '{{name}} נוסף.',
    'pantry.status.editingType': 'עריכת סוג: {{name}}',
    'pantry.status.renameTypeFailed': 'לא ניתן לשנות את שם הסוג הזה.',
    'pantry.status.typeRenamed': 'שם הסוג שונה ל-{{name}}.',
    'pantry.status.addTypeFailed': 'לא ניתן להוסיף את הסוג הזה.',
    'pantry.status.typeAdded': 'הסוג {{name}} נוסף.',
    'pantry.status.typeDeleted': 'הסוג {{name}} נמחק.',
    'pantry.status.itemDeleted': '{{name}} נמחק.',
    'pantry.status.deleteItemFailed': 'לא ניתן למחוק את הפריט.',
    'pantry.status.keepOneType': 'יש להשאיר לפחות סוג אחד.',

    'addItems.title': 'הוספת פריטים',
    'addItems.searchPlaceholder': 'חיפוש פריט, סוג או יחידה',
    'addItems.noneFound': 'לא נמצאו פריטים שתואמים לסוג ולחיפוש שנבחרו.',
    'addItems.submit': 'הוספת פריטים ({{count}})',

    'addToList.title': 'הוספה לרשימת קניות',
    'addToList.helper': 'להוסיף את כל {{count}} המרכיבים אל:',
    'addToList.submit': 'הוספת {{count}} פריטים',

    'confirm.cancel': 'ביטול',

    'listEdit.title': 'עריכת רשימה',
    'listEdit.newItemSection': 'הוספת פריט חדש',
    'listEdit.availableItemsLabel': 'פריטים זמינים',
    'listEdit.chooseSharedItems': 'בחירה מהפריטים המשותפים שלך',
    'listEdit.helper': 'הוסיפו פריטים משותפים חדשים מלשונית הפריטים ואז בחרו אותם כאן.',
    'listEdit.currentItems': 'פריטים נוכחיים',
    'listEdit.emptySection': 'אין פריטים בחלק זה.',

    'itemPicker.chooseItem': 'בחירת פריט',
    'itemPicker.searchPlaceholder': 'חיפוש בפריטים זמינים',
    'itemPicker.empty': 'לא נמצאו פריטים התואמים לחיפוש.',

    'recipeCard.addPhoto': 'הוספת תמונה',

    'recipeDetail.addPhoto': 'הוספת תמונת מתכון',
    'recipeDetail.ingredients': 'מרכיבים',
    'recipeDetail.addToList': 'הוספה לרשימה',

    'shareImport.title': 'ייבוא שיתוף',
    'shareImport.helper': 'הדביקו כאן הודעת שיתוף של StockUp כדי לראות תצוגה מקדימה לפני הוספה.',
    'shareImport.placeholder': 'הדבקת טקסט שיתוף...',
    'shareImport.submit': 'תצוגה מקדימה לייבוא',
    'shareImport.invalid': 'הטקסט שהודבק אינו הודעת שיתוף תקינה של StockUp.',

    'importPreview.title': 'אישור ייבוא',
    'importPreview.missingItemsTitle': 'פריטים חדשים שיתווספו לקטלוג הפריטים שלך',
    'importPreview.noMissingItems': 'כל הפריטים המשותפים כבר קיימים בקטלוג שלך.',
    'importPreview.recipeMessage': 'המתכון "{{name}}" יתווסף עם {{count}} מרכיבים.',
    'importPreview.listMessage': '{{count}} פריטי קניות ימוזגו אל "{{name}}".',
    'importPreview.confirmRecipe': 'הוספת מתכון',
    'importPreview.confirmList': 'הוספת פריטי קניות',

    'recipeEdit.permissionTitle': 'נדרשת הרשאה',
    'recipeEdit.permissionMessage': 'אפשרו גישה לגלריה כדי לבחור תמונת מתכון, או המשיכו בלי תמונה.',
    'recipeEdit.untitled': 'מתכון ללא שם',
    'recipeEdit.addRecipe': 'הוספת מתכון',
    'recipeEdit.editRecipe': 'עריכת מתכון',
    'recipeEdit.pickImage': 'בחירת תמונה',
    'recipeEdit.titlePlaceholder': 'כותרת',
    'recipeEdit.subtitlePlaceholder': 'כותרת משנה',
    'recipeEdit.descriptionPlaceholder': 'תיאור',
    'recipeEdit.time': 'זמן',
    'recipeEdit.mins': 'דקות',
    'recipeEdit.difficulty': 'רמת קושי',
    'recipeEdit.chooseDifficulty': 'בחירת רמת קושי',
    'recipeEdit.servings': 'מנות',
    'recipeEdit.servingsSuffix': 'מנות',
    'recipeEdit.category': 'קטגוריה',
    'recipeEdit.ingredients': 'מרכיבים',
    'recipeEdit.chooseItem': 'בחירת פריט',
    'recipeEdit.countUnit': 'כמות',
    'recipeEdit.itemUnit': 'יחידה',
    'recipeEdit.emptyIngredients': 'בחרו פריטים מרשימת הפריטים כדי לבנות את המתכון.',
    'recipeEdit.createRecipe': 'יצירת מתכון',
    'recipeEdit.saveRecipe': 'שמירת מתכון',

    'success.itemsAdded': '{{count}} פריטים נוספו!',
    'success.addedToList': 'הם נוספו אל "{{name}}".',
    'success.viewList': 'מעבר לרשימת הקניות',
  },
};

const interpolate = (template: string, params?: TranslationParams) => {
  if (!params) {
    return template;
  }

  return Object.entries(params).reduce(
    (result, [key, value]) => result.replace(new RegExp(`{{${key}}}`, 'g'), String(value)),
    template,
  );
};

const isLanguage = (value: string | null): value is AppLanguage => value === 'en' || value === 'he';

const LocalizationContext = createContext<LocalizationContextValue | null>(null);

type LocalizationProviderProps = {
  children: ReactNode;
};

export function LocalizationProvider({ children }: LocalizationProviderProps) {
  const [language, setLanguageState] = useState<AppLanguage>(DEFAULT_LANGUAGE);

  useEffect(() => {
    let active = true;

    const loadLanguage = async () => {
      try {
        const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

        if (!active || !isLanguage(storedLanguage)) {
          return;
        }

        setLanguageState(storedLanguage);
      } catch {
      }
    };

    void loadLanguage();

    return () => {
      active = false;
    };
  }, []);

  const setLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);

    const shouldUseRTL = nextLanguage === 'he';
    const restartRequired = I18nManager.isRTL !== shouldUseRTL;

    if (restartRequired) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(shouldUseRTL);
    }

    return { restartRequired };
  }, []);

  const t = useCallback(
    (key: string, params?: TranslationParams) => {
      const catalog = translations[language] ?? translations.en;
      const template = catalog[key] ?? translations.en[key] ?? key;

      return interpolate(template, params);
    },
    [language],
  );

  const value = useMemo(
    () => ({ language, isRTL: language === 'he', t, setLanguage }),
    [language, setLanguage, t],
  );

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export const useI18n = () => {
  const context = useContext(LocalizationContext);

  if (!context) {
    throw new Error('useI18n must be used within LocalizationProvider');
  }

  return context;
};
