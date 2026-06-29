import {
  LegalLayout,
  LegalSection,
  LegalSubheading,
  LegalParagraph,
  LegalList,
  LegalOrderedList,
  LegalLink,
  LegalTable,
  LegalTh,
  LegalTd,
} from './LegalLayout';

export function AccountDeletionPage() {
  return (
    <LegalLayout title="アカウント削除について" updated="最終更新日: 2026年4月1日">
      <LegalParagraph>
        PivotLog（以下「本アプリ」）では、ユーザーがいつでもアカウントと関連データの削除をリクエストできます。
      </LegalParagraph>

      <LegalSection title="アカウント削除の手順">
        <LegalSubheading>アプリ内から削除する場合</LegalSubheading>
        <LegalOrderedList>
          <li>PivotLogアプリを開く</li>
          <li>
            画面右上の <b>設定アイコン（⚙）</b> をタップ
          </li>
          <li>
            画面下部の <b>「アカウントを削除」</b> をタップ
          </li>
          <li>
            確認ダイアログで <b>「削除」</b> を選択
          </li>
          <li>
            再確認ダイアログで <b>「削除する」</b> を選択
          </li>
        </LegalOrderedList>

        <LegalSubheading>メールで削除をリクエストする場合</LegalSubheading>
        <LegalParagraph>
          アプリにアクセスできない場合は、以下のメールアドレスまでアカウント削除をリクエストしてください。
        </LegalParagraph>
        <LegalParagraph>
          <b>連絡先</b>: kumasan.11251@gmail.com
        </LegalParagraph>
        <LegalParagraph>
          メールには、登録に使用したメールアドレスを記載してください。リクエスト受領後、30日以内に削除を完了します。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="削除されるデータ">
        <LegalParagraph>
          アカウントを削除すると、以下のすべてのデータが<b>完全に削除</b>されます。
        </LegalParagraph>
        <LegalTable>
          <thead>
            <tr>
              <LegalTh>データの種類</LegalTh>
              <LegalTh>削除対象</LegalTh>
            </tr>
          </thead>
          <tbody>
            <tr>
              <LegalTd>アカウント情報</LegalTd>
              <LegalTd>メールアドレス、認証情報</LegalTd>
            </tr>
            <tr>
              <LegalTd>プロフィール情報</LegalTd>
              <LegalTd>生年月日、目標寿命などの設定</LegalTd>
            </tr>
            <tr>
              <LegalTd>日記データ</LegalTd>
              <LegalTd>すべての日記エントリ</LegalTd>
            </tr>
            <tr>
              <LegalTd>AIリフレクション</LegalTd>
              <LegalTd>AI による振り返りコメント</LegalTd>
            </tr>
            <tr>
              <LegalTd>インサイトデータ</LegalTd>
              <LegalTd>週次・月次のインサイト</LegalTd>
            </tr>
            <tr>
              <LegalTd>ホーム画面設定</LegalTd>
              <LegalTd>表示設定、テーマ設定</LegalTd>
            </tr>
            <tr>
              <LegalTd>AI利用状況</LegalTd>
              <LegalTd>利用回数の記録</LegalTd>
            </tr>
          </tbody>
        </LegalTable>
      </LegalSection>

      <LegalSection title="保持されるデータ">
        <LegalParagraph>以下のデータはアカウント削除後も一定期間保持される場合があります。</LegalParagraph>
        <LegalTable>
          <thead>
            <tr>
              <LegalTh>データの種類</LegalTh>
              <LegalTh>保持期間</LegalTh>
              <LegalTh>理由</LegalTh>
            </tr>
          </thead>
          <tbody>
            <tr>
              <LegalTd>サブスクリプション情報</LegalTd>
              <LegalTd>Apple / Google の規定に準拠</LegalTd>
              <LegalTd>
                購入履歴は Apple App Store および Google Play の決済システムで管理されており、本アプリでは削除できません。サブスクリプションの解約は、各ストアの設定画面から行ってください。
              </LegalTd>
            </tr>
            <tr>
              <LegalTd>匿名の利用統計</LegalTd>
              <LegalTd>削除後保持しません</LegalTd>
              <LegalTd>本アプリは匿名の利用統計を収集していません。</LegalTd>
            </tr>
          </tbody>
        </LegalTable>
      </LegalSection>

      <LegalSection title="データ削除の完了時期">
        <LegalList>
          <li>
            <b>アプリ内から削除した場合</b>: 即時削除されます。
          </li>
          <li>
            <b>メールでリクエストした場合</b>: リクエスト受領後、30日以内に削除を完了します。
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="お問い合わせ">
        <LegalParagraph>アカウント削除に関するご質問は、以下までお問い合わせください。</LegalParagraph>
        <LegalList>
          <li>
            <b>メール</b>: kumasan.11251@gmail.com
          </li>
          <li>
            <b>GitHub Issues</b>:{' '}
            <LegalLink href="https://github.com/kumasan11251/PivotLog/issues">
              https://github.com/kumasan11251/PivotLog/issues
            </LegalLink>
          </li>
        </LegalList>
      </LegalSection>
    </LegalLayout>
  );
}
