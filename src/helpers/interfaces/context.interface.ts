import { Context, Scenes } from 'telegraf';

export interface MyWizardSession extends Scenes.WizardSessionData {
  // will be available under `ctx.scene.session.myWizardSessionProp`
  myWizardSessionProp: number;
}

export interface MySession extends Scenes.WizardSession<MyWizardSession> {
  // will be available under `ctx.session.mySessionProp`
  mySessionProp: number;

  chat_id: number;
  username: string;
  phone: string;
  name: string;
  selectedDays: any;
  selectedManager: any;
  selectedMonth: any;
  selectedMonthIndex: any;
  page: number;
  groupedDuties: any;
}

export interface MyContext extends Context {
  // will be available under `ctx.myContextProp`
  myContextProp: string;

  // declare session type
  session: MySession;
  // declare scene type
  scene: Scenes.SceneContextScene<MyContext, MyWizardSession>;
  // declare wizard type
  wizard: Scenes.WizardContextWizard<MyContext>;
}
