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

const LANGUAGE_STORAGE_KEY = 'stockapp.language.preference';
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

    'settings.appearanceTitle': 'Appearance',
    'settings.themeTitle': 'Theme',
    'settings.languageTitle': 'Language',
    'settings.accountTitle': 'Account',
    'settings.googleConnected': 'Signed in to StockApp.',
    'settings.offlineMode': 'Offline mode. Your data stays on this device.',
    'settings.sync.idle': 'Sync is not active.',
    'settings.sync.syncing': 'Syncing with StockApp...',
    'settings.sync.synced': 'Synced with StockApp.',
    'settings.sync.failed': 'Sync failed. Your local data is still safe.',
    'settings.retrySync': 'Retry sync',
    'settings.logout': 'Log out',
    'settings.restartRequiredTitle': 'Restart required',
    'settings.restartRequiredMessage': 'Please restart the app to apply layout direction changes.',
    'share.previewTitle': 'Shared with you',
    'share.signInRequired': 'Sign in to preview and accept this copy.',
    'share.loading': 'Loading shared item...',
    'share.previewError': 'Could not load this link.',
    'share.expired': 'This share link has expired.',
    'share.accept': 'Add to my StockApp',
    'share.accepting': 'Adding...',
    'share.acceptFailed': 'Could not add this item.',
    'share.createFailed': 'Could not create a share link.',
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
    'tabs.household': 'Household',

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
    'list.createList': 'Create grocery list',
    'list.deleteList': 'Delete grocery list',
    'list.newListPlaceholder': 'List name',
    'list.deleteListTitle': 'Delete grocery list?',
    'list.deleteListMessage': 'Delete {name} and its items?',
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
    'list.deleteItemTitle': 'Remove this item?',
    'list.deleteItemMessage': '{{name}} will be removed from your grocery list.',

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
    'pantry.deleteItemUsedMessage': '{{name}} will be removed from the shared catalog and from {{places}}.',
    'pantry.deleteItemRecipePlace': 'recipe "{{name}}"',
    'pantry.deleteItemListPlace': 'list "{{name}}"',
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
    'recipeDetail.deleteTitle': 'Delete this recipe?',
    'recipeDetail.deleteMessage': '{{name}} will be permanently removed.',

    'recipeEdit.permissionTitle': 'Permission needed',
    'recipeEdit.permissionMessage': 'Please allow photo library access to select a recipe image, or keep going without one.',
    'recipeEdit.imageSaveTitle': 'Image could not be saved',
    'recipeEdit.imageSaveMessage': 'The recipe was kept without an image. You can try selecting it again.',
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
    'auth.title': 'Keep your StockApp data safe',
    'auth.description': 'Sign in with Google to save your data on every device, or continue offline on this device.',
    'auth.google': 'Continue with Google',
    'auth.offline': 'Continue offline',
    'auth.note': 'Offline data is saved only on this device. You can connect Google later.',

    'household.title': 'Household',
    'household.emptySubtitle': 'Join a household to share your items, recipes, and grocery lists.',
    'household.findTitle': 'Find a household',
    'household.findText': 'Enter the invite link or code you received to apply to a household.',
    'household.invitePlaceholder': 'Invite link or code',
    'household.applyButton': 'Apply to household',
    'household.connectedSubtitle': 'Your shared household space',
    'household.membersTitle': 'Members',
    'household.unknownMember': 'Unknown member',
    'household.applicationsTitle': 'Applications',
    'household.noApplicationsTitle': 'No pending applications',
    'household.noApplicationsText': 'New household applications will appear here.',
    'household.loading': 'Loading household...',
    'household.loadFailedTitle': 'Could not load household',
    'household.loadFailedText': 'Please try again later.',
    'household.signInTitle': 'Sign in required',
    'household.signInText': 'Sign in with Google before joining a household.',
    'household.inviteRequiredTitle': 'Invite needed',
    'household.inviteRequiredText': 'Enter an invite link or code to continue.',
    'household.applyFailedTitle': 'Could not apply',
    'household.applyFailedText': 'The household invite could not be accepted.',
    'household.createTitle': 'Create a household',
    'household.createText': 'Create a shared space and invite people to join it.',
    'household.namePlaceholder': 'Household name',
    'household.createButton': 'Create household',
    'household.nameRequiredTitle': 'Name required',
    'household.nameRequiredText': 'Enter a name for your household.',
    'household.createFailedTitle': 'Could not create household',
    'household.createFailedText': 'Please try again later.',
    'household.applicationPendingTitle': 'Application pending',
    'household.applicationPendingText': 'Your request to join {{name}} is waiting for approval.',
    'household.applicationReceivedText': 'This person wants to join your household.',
    'household.acceptButton': 'Accept',
    'household.rejectButton': 'Reject',
    'household.applicationActionFailedTitle': 'Could not update application',
    'household.applicationActionFailedText': 'Please try again later.',
    'household.dataChoiceTitle': 'Choose what happens to personal data',
    'household.dataChoiceText': 'Move your personal data into this household, or discard it before joining.',
    'household.moveData': 'Move data',
    'household.discardData': 'Discard data',
    'household.inviteReadyTitle': 'Invite ready',
    'household.shareInviteButton': 'Share invite',
    'household.inviteShareFailedTitle': 'Could not share invite',
    'household.inviteShareFailedText': 'Try sharing the invite again.',
    'household.leaveTitle': 'Leave household?',
    'household.leaveText': 'Shared data stays with the household while other members remain. If you are the last member, it moves to your personal account and the household is removed.',
    'household.leaveButton': 'Leave household',
    'household.disbandTitle': 'Disband household?',
    'household.disbandText': 'The shared data moves to your personal account and the household is removed. This cannot be undone.',
    'household.disbandButton': 'Disband household',
    'household.lifecycleFailedTitle': 'Could not complete action',
    'household.lifecycleFailedText': 'The household could not be changed.',
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

    'settings.appearanceTitle': 'מראה',
    'settings.themeTitle': 'ערכת נושא',
    'settings.languageTitle': 'שפה',
    'settings.accountTitle': 'חשבון',
    'settings.googleConnected': 'מחוברים ל-StockApp.',
    'settings.offlineMode': 'מצב לא מקוון. הנתונים נשארים במכשיר הזה.',
    'settings.sync.idle': 'הסנכרון אינו פעיל.',
    'settings.sync.syncing': 'מסתנכרן עם StockApp...',
    'settings.sync.synced': 'מסונכרן עם StockApp.',
    'settings.sync.failed': 'הסנכרון נכשל. הנתונים המקומיים עדיין בטוחים.',
    'settings.retrySync': 'ניסיון סנכרון נוסף',
    'settings.logout': 'התנתקות',
    'settings.restartRequiredTitle': 'נדרשת הפעלה מחדש',
    'settings.restartRequiredMessage': 'יש להפעיל מחדש את האפליקציה כדי להחיל שינוי כיוון תצוגה.',
    'share.previewTitle': 'שותפו איתך',
    'share.signInRequired': 'יש להתחבר כדי לצפות בעותק ולקבל אותו.',
    'share.loading': 'טוענים את הפריט ששותף...',
    'share.previewError': 'לא ניתן לטעון את הקישור.',
    'share.expired': 'תוקף הקישור פג.',
    'share.accept': 'הוספה ל-StockApp שלי',
    'share.accepting': 'מוסיפים...',
    'share.acceptFailed': 'לא ניתן להוסיף את הפריט.',
    'share.createFailed': 'לא ניתן ליצור קישור לשיתוף.',
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
    'tabs.household': 'משק בית',

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
    'list.createList': 'יצירת רשימת קניות',
    'list.deleteList': 'מחיקת רשימת קניות',
    'list.newListPlaceholder': 'שם הרשימה',
    'list.deleteListTitle': 'למחוק את רשימת הקניות?',
    'list.deleteListMessage': 'למחוק את {name} ואת הפריטים שבה?',
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
    'list.deleteItemTitle': 'להסיר את הפריט הזה?',
    'list.deleteItemMessage': '{{name}} יוסר מרשימת הקניות.',

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
    'pantry.deleteItemUsedMessage': '{{name}} יוסר מהקטלוג המשותף וגם מ{{places}}.',
    'pantry.deleteItemRecipePlace': 'המתכון "{{name}}"',
    'pantry.deleteItemListPlace': 'הרשימה "{{name}}"',
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
    'recipeDetail.deleteTitle': 'למחוק את המתכון הזה?',
    'recipeDetail.deleteMessage': '{{name}} יוסר לצמיתות.',

    'recipeEdit.permissionTitle': 'נדרשת הרשאה',
    'recipeEdit.permissionMessage': 'אפשרו גישה לגלריה כדי לבחור תמונת מתכון, או המשיכו בלי תמונה.',
    'recipeEdit.imageSaveTitle': 'לא ניתן לשמור את התמונה',
    'recipeEdit.imageSaveMessage': 'המתכון נשמר ללא תמונה. אפשר לנסות לבחור אותה שוב.',
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
    'auth.title': 'שמרו על נתוני StockApp',
    'auth.description': 'התחברו עם Google כדי לשמור את הנתונים בכל מכשיר, או המשיכו במצב לא מקוון.',
    'auth.google': 'המשך עם Google',
    'auth.offline': 'המשך ללא התחברות',
    'auth.note': 'נתונים לא מקוונים נשמרים רק במכשיר הזה. אפשר להתחבר ל-Google מאוחר יותר.',

    'household.title': 'משק בית',
    'household.emptySubtitle': 'הצטרפו למשק בית כדי לשתף פריטים, מתכונים ורשימות קניות.',
    'household.findTitle': 'חיפוש משק בית',
    'household.findText': 'הזינו את קישור ההזמנה או הקוד שקיבלתם כדי להגיש בקשה להצטרפות.',
    'household.invitePlaceholder': 'קישור הזמנה או קוד',
    'household.applyButton': 'הגשת בקשה להצטרפות',
    'household.connectedSubtitle': 'המרחב המשותף של משק הבית שלך',
    'household.membersTitle': 'חברים',
    'household.unknownMember': 'חבר לא ידוע',
    'household.applicationsTitle': 'בקשות',
    'household.noApplicationsTitle': 'אין בקשות ממתינות',
    'household.noApplicationsText': 'בקשות חדשות להצטרפות למשק הבית יופיעו כאן.',
    'household.loading': 'טוען את משק הבית...',
    'household.loadFailedTitle': 'לא ניתן לטעון את משק הבית',
    'household.loadFailedText': 'נסו שוב מאוחר יותר.',
    'household.signInTitle': 'נדרשת התחברות',
    'household.signInText': 'התחברו עם Google לפני ההצטרפות למשק בית.',
    'household.inviteRequiredTitle': 'נדרשת הזמנה',
    'household.inviteRequiredText': 'הזינו קישור הזמנה או קוד כדי להמשיך.',
    'household.applyFailedTitle': 'לא ניתן להגיש בקשה',
    'household.applyFailedText': 'לא ניתן היה לקבל את הזמנת משק הבית.',
    'household.createTitle': 'יצירת משק בית',
    'household.createText': 'צרו מרחב משותף והזמינו אנשים להצטרף אליו.',
    'household.namePlaceholder': 'שם משק הבית',
    'household.createButton': 'יצירת משק בית',
    'household.nameRequiredTitle': 'נדרש שם',
    'household.nameRequiredText': 'הזינו שם למשק הבית.',
    'household.createFailedTitle': 'לא ניתן ליצור משק בית',
    'household.createFailedText': 'נסו שוב מאוחר יותר.',
    'household.applicationPendingTitle': 'הבקשה ממתינה',
    'household.applicationPendingText': 'הבקשה שלכם להצטרף ל{{name}} ממתינה לאישור.',
    'household.applicationReceivedText': 'המשתמש הזה רוצה להצטרף למשק הבית.',
    'household.acceptButton': 'אישור',
    'household.rejectButton': 'דחייה',
    'household.applicationActionFailedTitle': 'לא ניתן לעדכן את הבקשה',
    'household.applicationActionFailedText': 'נסו שוב מאוחר יותר.',
    'household.dataChoiceTitle': 'בחרו מה לעשות עם הנתונים האישיים',
    'household.dataChoiceText': 'העבירו את הנתונים האישיים למשק הבית או מחקו אותם לפני ההצטרפות.',
    'household.moveData': 'העברת נתונים',
    'household.discardData': 'מחיקת נתונים',
    'household.inviteReadyTitle': 'ההזמנה מוכנה',
    'household.shareInviteButton': 'שיתוף הזמנה',
    'household.inviteShareFailedTitle': 'לא ניתן לשתף את ההזמנה',
    'household.inviteShareFailedText': 'נסו לשתף את ההזמנה שוב.',
    'household.leaveTitle': 'לעזוב את משק הבית?',
    'household.leaveText': 'הנתונים המשותפים יישארו במשק הבית כל עוד יש חברים נוספים. אם אתם החברים האחרונים, הנתונים יעברו לחשבון האישי ומשק הבית יוסר.',
    'household.leaveButton': 'עזיבת משק הבית',
    'household.disbandTitle': 'לפרק את משק הבית?',
    'household.disbandText': 'הנתונים המשותפים יעברו לחשבון האישי ומשק הבית יוסר. אי אפשר לבטל פעולה זו.',
    'household.disbandButton': 'פירוק משק הבית',
    'household.lifecycleFailedTitle': 'לא ניתן להשלים את הפעולה',
    'household.lifecycleFailedText': 'לא ניתן היה לשנות את משק הבית.',
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
