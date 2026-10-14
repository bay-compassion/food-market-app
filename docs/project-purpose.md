# Shopping for Food Shouldn’t Start with a Race

At The Bay Compassion’s community food market, guests shop for their groceries. They choose food
that meets their needs, much as they would in a grocery store. That might seem like a small
distinction, but choosing what to bring home is part of the dignity we want our market to offer.

That commitment starts before someone reaches the grocery tables. It starts with whether they
can get a place to shop, and what we ask them to do to secure one.

## When Registration Becomes a Race

During COVID, we adopted a digital queue to help us run the market. As we continued using it,
we began looking more closely at the registration process and whether it served the people
coming to shop.

On Saturday mornings, guests rushed to sign up. By 10:31 a.m., all the shopping places were taken.
Some people entered only their initials to finish faster. Taking time to read or fill out a form
could mean losing a place.

For seniors, people less comfortable with technology, and people reading in a language that
isn’t their own, that rush creates another barrier to getting food. The speed at which someone
can complete a form tells us very little about how much they need the groceries they came for.

We wanted to give people more time, and to bring the care we put into the shopping experience
into registration as well.

## Time to Register, Before Places Are Assigned

The app we are building gives guests a fifteen-minute registration window before selection.
They can take time to read, enter their information accurately, and register in a familiar
language. Finishing the form first no longer needs to be the way to secure a shopping place.

Guests can also register from home. When there isn’t a place for them that day, learning that
before making the trip can save them time and travel.

There are still limits on how many people can shop. A longer window doesn’t remove that limit,
and registration doesn’t guarantee a place. It changes the process: people have time to ask for
one before we decide how the available places will be allocated.

Building an app we control also gives us room to develop that approach over time. Adjustable
lottery weights and manual promotion let us revisit how places are assigned as we learn more
about our guests and the opportunities they have had to shop. We are still working out how to
use those capabilities. Having the tools is a starting point; deciding how to use them equitably
is ongoing work.

## Reaching the People Who Live Here

Giving guests more time matters only if they can understand and use the app. We put substantial
consideration into language support for the communities in our region, choosing languages with
the local population in mind. The guest experience is available in English, Spanish, Tagalog,
Chinese, Farsi, Arabic, Vietnamese, and French.

That work extends beyond translating a signup form. Guests need to understand when registration
is open, what information we are asking for, whether they have been selected, and what to do when
it is their turn. Language choices appear in their own languages so people can recognize them.
For Arabic and Farsi, the layout follows a right-to-left reading direction. The aim is to let
guests navigate the process in a familiar language, rather than ask them to translate it while
trying to secure a place.

We have also made accessibility part of the interface. Clearly labeled fields and prominent
queue numbers help people understand what they are entering and where they stand. Visible focus
indicators support keyboard navigation, and status announcements let screen readers convey
updates as the visit progresses. Animations on the queue number board respect a preference for
reduced motion.

These details belong to the same purpose as the longer registration window. Reading a different
language, using assistive technology, or needing more time to interact with a phone should not
be another hurdle on the way to getting groceries. We are designing for that range of needs as
we build the service.

## The Need Beyond a Full Queue

The old registration process also left us with a question we couldn’t answer: how many people
wanted to shop but never got a chance to register?

When registration closes as soon as capacity is reached, we can count the places we filled.
We cannot see the demand beyond them. A full queue looks the same whether a few more people
wanted to register or many more did.

Keeping registration open for the full window can help us see more of that unmet demand. We
can learn from registrations that do not result in a shopping place, alongside those that do.
It won’t tell us everything about food insecurity in our community, but it gives us a fuller
picture than a count that stops when the queue is full.

Demographic and market questionnaires serve a related purpose. Aggregate information can help
us understand whom we are reaching and communicate those needs when we apply for grants or
explain our work to supporters. We want to tell the story of the people our market serves,
including the need that our available places cannot accommodate.

## Protecting the Information Guests Entrust to Us

Understanding whom we serve brings a responsibility to care for the information people share.
A name, a phone number, or details about a household should help us provide the service without
becoming information that anyone in the queue can see.

The app separates access according to the work someone needs to do. Staff sign in, and the server
checks permissions before granting access. Running the day’s queue does not automatically grant
access to the full guest history or identifying exports. Aggregate reports let us understand the
market’s activity, while access to individual records is controlled separately. Guests use a
private credential to see their own visit; the shared calling board shows numbers rather than
names or contact information.

That care extends to the less visible parts of the system. Access credentials are stored on the
server as hashes, and API responses are marked not to be cached. Operational logging removes
sensitive fields, while monitoring is configured to mask typed inputs and marked identity details
and exclude request bodies from replay recordings. These are concrete safeguards we build into
the app and continue to review as its configuration changes.

Guests also have choices. Text updates require explicit consent, and guests can turn them off.
On a shared phone, they can clear their saved identity and household details from the browser.
That clears what the device remembers about them; the market’s records remain protected by the
server’s access controls.

We need personal information to operate the market, and gathering it means taking its privacy
seriously. The [privacy and security design](privacy-design.md) describes the controls in the code
and the configuration choices that accompany them. We want better information about community
needs while being careful with the personal details behind those counts.

## Carrying the Market’s Purpose into the App

Our [Compassion Food program](https://www.thebaycompassion.org/programs/compassion-food) exists to
provide nutritious food and supportive resources with dignity, hope, and belonging. At the
market, the opportunity to choose groceries is one way we put that purpose into practice.

Through conversations with stakeholders and observation of market day, we have been shaping an
app around the people who use the service. Registration, translation, accessibility, privacy, selection,
and guest information all belong to the same question: how can the process of getting a shopping place
better reflect the care we want people to experience when they arrive?

These are the aims guiding the project. We still have work to do to understand its results and
develop our allocation approach. Giving guests time to register and making more of the demand
visible are steps toward a market experience that reflects our mission from the beginning.
