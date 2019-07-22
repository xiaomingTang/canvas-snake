import * as React from "react"
import { Button } from "antd"

import * as Styles from "./index.module.scss"

const { Fragment } = React

interface PoperProps {
    mask?: boolean;
    maskCloseable?: boolean;
    children: React.ReactChild;
    state: [boolean, React.Dispatch<boolean>];
}

interface TriggerProps {
    className?: string;
    style?: object;
    icon?: string;
    shape?: "round" | "circle" | "circle-outline";
    state: [boolean, React.Dispatch<boolean>];
}

export function Poper({
  mask = true, maskCloseable = true, children, state,
}: PoperProps) {
  const [poperVisible, setPoperVisible] = state

  if (!poperVisible) {
    return null
  }

  return <Fragment>
    {
      mask && <div
        className={Styles.mask}
        role="button"
        tabIndex={-1}
        onClick={() => {
          if (maskCloseable) {
            setPoperVisible(false)
          }
        }}
        onKeyPress={() => {}}
      />
    }

    <div className={Styles.poper}>
      <div className={Styles.inner}>
        { children }
      </div>
      <Button icon="close" shape="circle-outline" style={{
        position: "absolute",
        right: "-16px",
        top: "-16px",
      }} onClick={() => {
        setPoperVisible(false)
      }} />
    </div>
  </Fragment>
}

export function PoperTrigger({
  className, style, state, icon = "info", shape = "circle-outline",
}: TriggerProps) {
  const [poperVisible, setPoperVisible] = state

  if (poperVisible) {
    return null
  }

  return <Button
    icon={icon}
    shape={shape}
    className={className}
    style={style}
    onClick={() => {
      setPoperVisible(true)
    }}
  />
}
