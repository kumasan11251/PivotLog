import {
  LegalLayout,
  LegalSection,
  LegalParagraph,
  LegalList,
  LegalTable,
  LegalTh,
  LegalTd,
} from './LegalLayout';

export function TokushohoPage() {
  return (
    <LegalLayout title="特定商取引法に基づく表記" updated="最終更新日: 2026年3月22日">
      <LegalTable>
        <thead>
          <tr>
            <LegalTh>項目</LegalTh>
            <LegalTh>内容</LegalTh>
          </tr>
        </thead>
        <tbody>
          <tr>
            <LegalTd>販売業者</LegalTd>
            <LegalTd>村田健伍</LegalTd>
          </tr>
          <tr>
            <LegalTd>連絡先メールアドレス</LegalTd>
            <LegalTd>kumasan.11251@gmail.com</LegalTd>
          </tr>
          <tr>
            <LegalTd>所在地</LegalTd>
            <LegalTd>請求があった場合に遅滞なく開示いたします</LegalTd>
          </tr>
          <tr>
            <LegalTd>電話番号</LegalTd>
            <LegalTd>請求があった場合に遅滞なく開示いたします</LegalTd>
          </tr>
          <tr>
            <LegalTd>販売価格</LegalTd>
            <LegalTd>月額プラン: 580円（税込） / 年額プラン: 4,800円（税込）</LegalTd>
          </tr>
          <tr>
            <LegalTd>支払方法</LegalTd>
            <LegalTd>App Store（Apple）またはGoogle Play（Google）の決済</LegalTd>
          </tr>
          <tr>
            <LegalTd>支払時期</LegalTd>
            <LegalTd>購入手続き完了時に課金されます</LegalTd>
          </tr>
          <tr>
            <LegalTd>商品の提供時期</LegalTd>
            <LegalTd>購入手続き完了後、即時ご利用いただけます</LegalTd>
          </tr>
          <tr>
            <LegalTd>返品・キャンセルについて</LegalTd>
            <LegalTd>
              各ストア（App Store / Google Play）のポリシーに準拠します。サブスクリプションの解約は各ストアの設定画面から行うことができます
            </LegalTd>
          </tr>
          <tr>
            <LegalTd>動作環境</LegalTd>
            <LegalTd>iOS 15.1以上 / Android 6.0（API 23）以上</LegalTd>
          </tr>
        </tbody>
      </LegalTable>

      <LegalSection title="お問い合わせ">
        <LegalParagraph>ご質問やご不明な点がある場合は、以下までお問い合わせください：</LegalParagraph>
        <LegalList>
          <li>メール: kumasan.11251@gmail.com</li>
        </LegalList>
      </LegalSection>
    </LegalLayout>
  );
}
