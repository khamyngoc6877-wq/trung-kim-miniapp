import TransitionLink from "@/components/transition-link";
import { ReactNode } from "react";
import { List } from "zmp-ui";
import { useTranslation } from "@/hooks/use-translation";

function DeliverySummary(props: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  description?: string;
  linkTo?: string;
}) {
  const { t } = useTranslation();
  return (
    <List.Item
      prefix={props.icon}
      suffix={
        props.linkTo && (
          <TransitionLink to={props.linkTo} className="text-xs text-primary">
            {t("common", "change")}
          </TransitionLink>
        )
      }
      title={props.title}
    >
      <div className="flex-1 flex flex-col space-y-0.5">
        {props.subtitle && <span className="text-sm">{props.subtitle}</span>}
        {props.description && (
          <span className="text-xs text-inactive">{props.description}</span>
        )}
      </div>
    </List.Item>
  );
}

export default DeliverySummary;
