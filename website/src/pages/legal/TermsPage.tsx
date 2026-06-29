import {
  LegalLayout,
  LegalSection,
  LegalSubheading,
  LegalParagraph,
  LegalList,
  LegalLink,
} from './LegalLayout';
import { SITE_PATHS } from '../../lib/site';

export function TermsPage() {
  return (
    <LegalLayout title="利用規約" updated="最終更新日: 2026年3月22日">
      <LegalParagraph>
        本利用規約（以下「本規約」）は、村田健伍（以下「運営者」）が提供するモバイルアプリケーション「PivotLog」（以下「本アプリ」）の利用条件を定めるものです。本アプリをご利用いただく前に、本規約をよくお読みください。
      </LegalParagraph>

      <LegalSection title="1. 本規約への同意">
        <LegalParagraph>
          本アプリをダウンロード、インストール、または使用することにより、ユーザーは本規約に同意したものとみなされます。本規約に同意いただけない場合は、本アプリのご利用をお控えください。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="2. アカウントについて">
        <LegalParagraph>本アプリでは、以下の方法でアカウントを作成できます：</LegalParagraph>
        <LegalList>
          <li>ゲスト（匿名）ログイン</li>
          <li>メールアドレスによるログイン</li>
          <li>Googleアカウントによるログイン</li>
          <li>Apple IDによるログイン</li>
        </LegalList>
        <LegalParagraph>
          ユーザーは、自身のアカウント情報の管理について責任を負うものとします。ゲストアカウントの場合、アプリの再インストールやデバイス変更時にデータが失われる可能性があります。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="3. サブスクリプション">
        <LegalSubheading>3.1 プレミアムプラン</LegalSubheading>
        <LegalParagraph>
          本アプリでは、追加機能を利用できるプレミアムプラン（有料サブスクリプション）を提供しています。価格は各ストア（App Store / Google Play）の販売ページに表示される金額に準じます。詳細は
          <LegalLink href={SITE_PATHS.tokushoho}>特定商取引法に基づく表記</LegalLink>
          をご確認ください。
        </LegalParagraph>

        <LegalSubheading>3.2 自動更新</LegalSubheading>
        <LegalParagraph>
          サブスクリプションは、現在の期間が終了する24時間前までにキャンセルしない限り、自動的に更新されます。
        </LegalParagraph>

        <LegalSubheading>3.3 解約方法</LegalSubheading>
        <LegalParagraph>サブスクリプションの解約は、各ストアの設定画面から行うことができます：</LegalParagraph>
        <LegalList>
          <li>
            <b>iOS</b>: 設定 &gt; Apple ID &gt; サブスクリプション
          </li>
          <li>
            <b>Android</b>: Google Play ストア &gt; お支払いと定期購入 &gt; 定期購入
          </li>
        </LegalList>

        <LegalSubheading>3.4 無料トライアル</LegalSubheading>
        <LegalParagraph>
          本アプリでは無料トライアル期間は設けておりません。サブスクリプション購入後、即時にプレミアム機能をご利用いただけます。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="4. AI機能について">
        <LegalSubheading>4.1 免責事項</LegalSubheading>
        <LegalParagraph>
          本アプリのAI機能（AIリフレクション、週次インサイト、月次インサイト）は、Google Gemini APIを利用して提供されています。AIが生成するコンテンツは参考情報であり、以下の点にご注意ください：
        </LegalParagraph>
        <LegalList>
          <li>AIの生成内容は、医療、法律、金融等の専門的なアドバイスではありません</li>
          <li>重要な判断を行う際は、必ず専門家にご相談ください</li>
          <li>AIの生成内容の正確性、完全性、有用性について、運営者は保証いたしません</li>
        </LegalList>

        <LegalSubheading>4.2 データの送信</LegalSubheading>
        <LegalParagraph>
          AI機能の利用にあたり、日記の内容がGoogle Gemini APIに送信されます。詳細は
          <LegalLink href={SITE_PATHS.privacy}>プライバシーポリシー</LegalLink>
          をご確認ください。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="5. 禁止事項">
        <LegalParagraph>ユーザーは、本アプリの利用にあたり、以下の行為を行ってはなりません：</LegalParagraph>
        <LegalList>
          <li>法令または公序良俗に違反する行為</li>
          <li>他のユーザーまたは第三者の権利を侵害する行為</li>
          <li>本アプリのサーバーやネットワークに過度の負荷をかける行為</li>
          <li>本アプリのリバースエンジニアリング、逆コンパイル、逆アセンブルを行う行為</li>
          <li>本アプリの運営を妨害する行為</li>
          <li>不正アクセスを試みる行為</li>
          <li>その他、運営者が不適切と判断する行為</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="6. 知的財産権">
        <LegalParagraph>
          本アプリに関するすべての知的財産権（著作権、商標権等）は、運営者またはライセンサーに帰属します。本規約に基づく利用許諾は、これらの権利の譲渡を意味するものではありません。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="7. 免責事項・損害賠償の制限">
        <LegalSubheading>7.1 免責事項</LegalSubheading>
        <LegalParagraph>運営者は、以下の事項について責任を負いません：</LegalParagraph>
        <LegalList>
          <li>本アプリの利用に起因するいかなる損害</li>
          <li>本アプリの中断、停止、終了、利用不能、または変更</li>
          <li>ユーザーのデータの消失または破損</li>
          <li>AI機能が生成したコンテンツに基づく判断や行動による結果</li>
        </LegalList>
        <LegalParagraph>
          ただし、運営者の故意または重過失による場合、および消費者契約法その他の強行法規に反する場合は、この限りではありません。
        </LegalParagraph>

        <LegalSubheading>7.2 損害賠償の制限</LegalSubheading>
        <LegalParagraph>
          運営者の損害賠償責任は、法令で許容される最大限の範囲で制限されるものとします。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="8. 規約の変更">
        <LegalParagraph>
          運営者は、必要に応じて本規約を変更することができます。重要な変更がある場合は、アプリ内で通知します。変更後も本アプリの利用を継続した場合、変更後の規約に同意したものとみなされます。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="9. 準拠法・管轄裁判所">
        <LegalParagraph>
          本規約は、日本法に準拠して解釈されるものとします。本規約に関する紛争については、神戸地方裁判所姫路支部を第一審の専属的合意管轄裁判所とします。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="10. お問い合わせ">
        <LegalParagraph>本規約に関するご質問がある場合は、以下までお問い合わせください：</LegalParagraph>
        <LegalList>
          <li>事業者: 村田健伍（個人開発者）</li>
          <li>メール: kumasan.11251@gmail.com</li>
        </LegalList>
      </LegalSection>
    </LegalLayout>
  );
}
