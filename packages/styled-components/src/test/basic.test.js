// @flow
/* eslint-disable no-console */
import hoist from 'hoist-non-react-statics';
import React, { Component, StrictMode } from 'react';
import { findDOMNode } from 'react-dom';
import { findRenderedComponentWithType, renderIntoDocument } from 'react-dom/test-utils';
import TestRenderer from 'react-test-renderer';
import { resetStyled, expectCSSMatches } from './utils';
import { find } from '../../test-utils';

let styled;

describe('basic', () => {
  /**
   * Make sure the setup is the same for every test
   */
  beforeEach(() => {
    styled = resetStyled();
  });

  it('should not throw an error when called with a valid element', () => {
    expect(() => styled.div``).not.toThrowError();

    const FunctionalComponent = () => <div />;
    class ClassComponent extends Component<*, *> {
      render() {
        return <div />;
      }
    }
    const validComps = ['div', FunctionalComponent, ClassComponent];
    validComps.forEach(comp => {
      expect(() => {
        const Comp = styled(comp)``;
        TestRenderer.create(<Comp />);
      }).not.toThrowError();
    });
  });

  it('should throw a meaningful error when called with an invalid element', () => {
    const FunctionalComponent = () => <div />;
    class ClassComponent extends Component<*, *> {
      render() {
        return <div />;
      }
    }
    const invalidComps = [
      undefined,
      null,
      123,
      [],
      <div />,
      <FunctionalComponent />,
      <ClassComponent />,
    ];

    invalidComps.forEach(comp => {
      expect(() => {
        // $FlowInvalidInputTest
        const Comp = styled(comp)``;
        TestRenderer.create(<Comp />);
        // $FlowInvalidInputTest
      }).toThrow(`Cannot create styled-component for component: ${comp}`);
    });
  });

  it('should not inject anything by default', () => {
    // eslint-disable-next-line no-unused-expressions
    styled.div``;
    expectCSSMatches('');
  });

  it('should inject styles', () => {
    const Comp = styled.div`
      color: blue;
    `;
    TestRenderer.create(<Comp />);
    expectCSSMatches('.b { color:blue; }');
  });

  it("should inject only once for a styled component, no matter how often it's mounted", () => {
    const Comp = styled.div`
      color: blue;
    `;
    TestRenderer.create(<Comp />);
    TestRenderer.create(<Comp />);
    expectCSSMatches('.b { color:blue; }');
  });

  it('Should have the correct styled(component) displayName', () => {
    const CompWithoutName = () => () => <div />;

    const StyledTag = styled.div``;
    expect(StyledTag.displayName).toBe('styled.div');

    const CompWithName = () => <div />;
    CompWithName.displayName = null;
    const StyledCompWithName = styled(CompWithName)``;
    expect(StyledCompWithName.displayName).toBe('Styled(CompWithName)');

    const CompWithDisplayName = CompWithoutName();
    CompWithDisplayName.displayName = 'displayName';
    const StyledCompWithDisplayName = styled(CompWithDisplayName)``;
    expect(StyledCompWithDisplayName.displayName).toBe('Styled(displayName)');

    const CompWithBoth = () => <div />;
    CompWithBoth.displayName = 'displayName';
    const StyledCompWithBoth = styled(CompWithBoth)``;
    expect(StyledCompWithBoth.displayName).toBe('Styled(displayName)');

    const CompWithNothing = CompWithoutName();
    CompWithNothing.displayName = null;
    const StyledCompWithNothing = styled(CompWithNothing)``;
    expect(StyledCompWithNothing.displayName).toBe('Styled(Component)');
  });

  it('should allow you to pass in style objects', () => {
    const Comp = styled.div({
      color: 'blue',
    });
    TestRenderer.create(<Comp />);
    expectCSSMatches('.b { color:blue; }');
  });

  it('should allow you to pass in style object with a function', () => {
    const Comp = styled.div({ color: ({ color }) => color });
    TestRenderer.create(<Comp color="blue" />);
    expectCSSMatches('.b { color:blue; }');
  });

  it('should allow you to pass in style nested object', () => {
    const Comp = styled.div({
      span: {
        small: {
          color: 'blue',
          fontFamily: 'sans-serif',
        },
      },
    });
    TestRenderer.create(<Comp />);
    expectCSSMatches('.b span small{ color:blue; font-family: sans-serif; }');
  });

  it('should allow you to pass in style nested object with a function', () => {
    const Comp = styled.div({
      span: {
        small: {
          color: ({ color }) => color,
          fontFamily: 'sans-serif',
        },
      },
    });
    TestRenderer.create(<Comp color="red" />);
    expectCSSMatches('.b span small{ color:red; font-family: sans-serif; }');
  });

  it('should allow you to pass in a function returning a style object', () => {
    const Comp = styled.div(({ color }) => ({
      color,
    }));
    TestRenderer.create(<Comp color="blue" />);
    expectCSSMatches('.b { color:blue; }');
  });

  it('emits the correct selector when a StyledComponent is interpolated into a template string', () => {
    const Comp = styled.div`
      color: red;
    `;

    expect(`${Comp}`).toBe(`.${Comp.styledComponentId}`);
  });

  it('works with the React 16.6 "memo" API', () => {
    const Comp = React.memo(props => <div {...props} />);
    const StyledComp = styled(Comp)`
      color: red;
    `;

    TestRenderer.create(<StyledComp color="blue" />);
    expectCSSMatches('.b { color:red; }');
  });

  it('does not filter outs custom props for uppercased string-like components', () => {
    const Comp = styled('Comp')`
      color: red;
    `;
    const wrapper = TestRenderer.create(<Comp customProp="abc" />);
    expect(wrapper.root.findByType('Comp').props.customProp).toBe('abc');
  });

  it('creates a proper displayName for uppercased string-like components', () => {
    const Comp = styled('Comp')`
      color: red;
    `;

    expect(Comp.displayName).toBe('Styled(Comp)');
  });

  describe('jsdom tests', () => {
    class InnerComponent extends Component<*, *> {
      render() {
        return <div {...this.props} />;
      }
    }

    it('should pass the full className to the wrapped child', () => {
      const OuterComponent = styled(InnerComponent)``;

      class Wrapper extends Component<*, *> {
        render() {
          return <OuterComponent className="test" />;
        }
      }

      const wrapper = TestRenderer.create(<Wrapper />);
      expect(wrapper.root.findByType(InnerComponent).props.className).toBe('sc-a test');
    });

    it('should pass the ref to the component', () => {
      const Comp = styled.div``;

      class Wrapper extends Component<*, *> {
        testRef: any = React.createRef();

        render() {
          return (
            <div>
              <Comp ref={this.testRef} />
            </div>
          );
        }
      }

      const wrapper = renderIntoDocument(<Wrapper />);

      // eslint-disable-next-line react/no-find-dom-node
      const component = find(findDOMNode(wrapper), Comp);

      expect(wrapper.testRef.current).toBe(component);
    });

    it('should pass the ref to the wrapped styled component', () => {
      class Inner extends React.Component {
        render() {
          return <div {...this.props} />;
        }
      }

      const Outer = styled(Inner)``;

      class Wrapper extends Component<*, *> {
        testRef: any = React.createRef();

        render() {
          return (
            <div>
              <Outer ref={this.testRef} />
            </div>
          );
        }
      }

      const wrapper = renderIntoDocument(<Wrapper />);
      const innerComponent = findRenderedComponentWithType(wrapper, Inner);

      expect(wrapper.testRef.current).toBe(innerComponent);
    });

    it('should respect the order of StyledComponent creation for CSS ordering', () => {
      const FirstComponent = styled.div`
        color: red;
      `;
      const SecondComponent = styled.div`
        color: blue;
      `;

      // NOTE: We're mounting second before first and check if we're breaking their order
      TestRenderer.create(<SecondComponent />);
      TestRenderer.create(<FirstComponent />);

      expectCSSMatches('.d { color:red; } .c { color:blue; }');
    });

    it('handle media at-rules inside style rules', () => {
      const Comp = styled.div`
        > * {
          @media (min-width: 500px) {
            color: pink;
          }
        }
      `;

      TestRenderer.create(<Comp />);
      expectCSSMatches('@media (min-width:500px){ .b > *{ color:pink; } } ');
    });

    it('should hoist non-react static properties', () => {
      const Inner = styled.div``;
      Inner.foo = 'bar';

      const Outer = styled(Inner)``;

      expect(Outer).toHaveProperty('foo', 'bar');
    });

    it('should not hoist styled component statics', () => {
      const Inner = styled.div``;
      const Outer = styled(Inner)``;

      expect(Outer.styledComponentId).not.toBe(Inner.styledComponentId);
      expect(Outer.componentStyle).not.toEqual(Inner.componentStyle);
    });

    // muting this test until we can fix it in a way that doesn't break HMR / rehydration
    it.skip('should not fold components if there is an interim HOC', () => {
      function withSomething(WrappedComponent) {
        function WithSomething(props) {
          return <WrappedComponent {...props} />;
        }

        hoistStatics(WithSomething, WrappedComponent);

        return WithSomething;
      }

      const Inner = withSomething(
        styled.div`
          color: red;
        `
      );

      const Outer = styled(Inner)`
        color: green;
      `;

      const rendered = TestRenderer.create(<Outer />);

      expectCSSMatches(`.sc-a {color: red;} .sc-b {color: green;}`);
      expect(rendered.toJSON()).toMatchInlineSnapshot(`
<div
  className="sc-a sc-b"
/>
`);
    });

    it('folds defaultProps', () => {
      const Inner = styled.div``;

      Inner.defaultProps = {
        theme: {
          fontSize: 12,
        },
        style: {
          background: 'blue',
          textAlign: 'center',
        },
      };

      const Outer = styled(Inner)``;

      Outer.defaultProps = {
        theme: {
          fontSize: 16,
        },
        style: {
          background: 'silver',
        },
      };

      expect(Outer.defaultProps).toMatchInlineSnapshot(`
Object {
  "style": Object {
    "background": "silver",
    "textAlign": "center",
  },
  "theme": Object {
    "fontSize": 16,
  },
}
`);
    });

    it('generates unique classnames when not using babel', () => {
      const Named1 = styled.div.withConfig({ displayName: 'Name' })`
        color: blue;
      `;

      const Named2 = styled.div.withConfig({ displayName: 'Name' })`
        color: red;
      `;

      expect(Named1.styledComponentId).not.toBe(Named2.styledComponentId);
    });

    it('honors a passed componentId', () => {
      const Named1 = styled.div.withConfig({
        componentId: 'foo',
        displayName: 'Name',
      })`
        color: blue;
      `;

      const Named2 = styled.div.withConfig({
        componentId: 'bar',
        displayName: 'Name',
      })`
        color: red;
      `;

      expect(Named1.styledComponentId).toBe('Name-foo');
      expect(Named2.styledComponentId).toBe('Name-bar');
    });

    // this no longer is possible in React 16.6 because
    // of the deprecation of findDOMNode; need to find an alternative
    it('should work in StrictMode without warnings', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const Comp = styled.div``;

      TestRenderer.create(
        <StrictMode>
          <Comp />
        </StrictMode>
      );

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('warnings', () => {
    beforeEach(() => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('does not warn for innerRef if using a custom component', () => {
      const InnerComp = props => <div {...props} />;
      const Comp = styled(InnerComp)``;
      const ref = React.createRef();

      TestRenderer.create(<Comp innerRef={ref} />);
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('does not warn if the className is consumed by a deeper child', () => {
      const Inner = ({ className }) => (
        <div>
          <span className={className} />
        </div>
      );

      const Comp = styled(Inner)`
        color: red;
      `;

      renderIntoDocument(
        <div>
          <Comp />
        </div>
      );

      expect(console.warn).not.toHaveBeenCalled();
    });
  });
});
